import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { getIO } from '@/lib/socket'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  try {
    const session = await auth.api.getSession({ headers: req.headers })
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const member = await db.projectMember.findFirst({
      where: { userId: session.user.id, projectId },
    })
    if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const url = new URL(req.url)
    const limit = parseInt(url.searchParams.get('limit') || '50', 10)
    const offset = parseInt(url.searchParams.get('offset') || '0', 10)

    const [prompts, total] = await Promise.all([
      db.prompt.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          user: { select: { id: true, name: true, email: true } },
          _count: { select: { logs: true } },
        },
      }),
      db.prompt.count({ where: { projectId } }),
    ])

    return NextResponse.json({ prompts, total })
  } catch (err) {
    console.error('[api/projects/[id]/prompts GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  try {
    const session = await auth.api.getSession({ headers: req.headers })
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const member = await db.projectMember.findFirst({
      where: { userId: session.user.id, projectId },
    })
    if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await req.json()
    const { content } = body

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Prompt content required' }, { status: 400 })
    }

    const prompt = await db.prompt.create({
      data: {
        projectId,
        userId: session.user.id,
        content: content.trim(),
        source: 'dashboard',
        status: 'pending',
      },
    })

    // Emit execute to agents in this project
    try {
      const io = getIO()
      await db.prompt.update({
        where: { id: prompt.id },
        data: { status: 'running', startedAt: new Date() },
      })
      io.to(`project-${projectId}`).emit('execute', {
        promptId: prompt.id,
        content: prompt.content,
      })
    } catch {
      // Socket.io not available yet
    }

    return NextResponse.json({ prompt }, { status: 201 })
  } catch (err) {
    console.error('[api/projects/[id]/prompts POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
