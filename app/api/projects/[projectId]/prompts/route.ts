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

    // Fetch user for the prompt:new broadcast
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true },
    })

    // Create prompt with running status immediately if agent is online
    let status = 'pending'
    let startedAt: Date | null = null

    try {
      const io = getIO()
      const room = `project-${projectId}`
      const roomSockets = await io.in(room).fetchSockets()
      const agentConnected = roomSockets.some((s) => s.data?.isAgent)
      if (agentConnected) {
        status = 'running'
        startedAt = new Date()
      }
    } catch {
      // Socket.io not available
    }

    const prompt = await db.prompt.create({
      data: {
        projectId,
        userId: session.user.id,
        content: content.trim(),
        source: 'dashboard',
        status,
        ...(startedAt && { startedAt }),
      },
    })

    const promptWithUser = { ...prompt, user, _count: { logs: 0 } }

    // Broadcast new prompt to all dashboard clients in the room
    try {
      const io = getIO()
      io.to(`project-${projectId}`).emit('prompt:new', promptWithUser)
      // Dispatch to agent if running
      if (status === 'running') {
        io.to(`project-${projectId}`).emit('execute', {
          promptId: prompt.id,
          content: prompt.content,
        })
      }
    } catch {
      // Socket.io not available
    }

    return NextResponse.json({ prompt: promptWithUser }, { status: 201 })
  } catch (err) {
    console.error('[api/projects/[id]/prompts POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
