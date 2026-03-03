import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'

async function requireMember(userId: string, projectId: string) {
  return db.projectMember.findFirst({ where: { userId, projectId } })
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  try {
    const session = await auth.api.getSession({ headers: req.headers })
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const member = await requireMember(session.user.id, projectId)
    if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        _count: { select: { prompts: true, members: true } },
      },
    })

    return NextResponse.json({ project, role: member.role })
  } catch (err) {
    console.error('[api/projects/[id] GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  try {
    const session = await auth.api.getSession({ headers: req.headers })
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const member = await requireMember(session.user.id, projectId)
    if (!member || !['owner', 'admin'].includes(member.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const project = await db.project.update({
      where: { id: projectId },
      data: {
        ...(body.name && { name: body.name.trim() }),
        ...(body.description !== undefined && { description: body.description?.trim() || null }),
      },
    })

    return NextResponse.json({ project })
  } catch (err) {
    console.error('[api/projects/[id] PATCH]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  try {
    const session = await auth.api.getSession({ headers: req.headers })
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const member = await requireMember(session.user.id, projectId)
    if (!member || member.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden — only owners can delete projects' }, { status: 403 })
    }

    await db.project.delete({ where: { id: projectId } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/projects/[id] DELETE]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
