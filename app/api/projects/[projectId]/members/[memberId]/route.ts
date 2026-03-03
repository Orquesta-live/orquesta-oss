import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; memberId: string }> }
) {
  const { projectId, memberId } = await params
  try {
    const session = await auth.api.getSession({ headers: req.headers })
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const callerMember = await db.projectMember.findFirst({
      where: { userId: session.user.id, projectId },
    })
    if (!callerMember || !['owner', 'admin'].includes(callerMember.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const target = await db.projectMember.findFirst({ where: { id: memberId, projectId } })
    if (!target) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

    // Cannot demote/change owner
    if (target.role === 'owner') {
      return NextResponse.json({ error: 'Cannot change owner role' }, { status: 403 })
    }

    const body = await req.json()
    const { role } = body

    if (!['member', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const updated = await db.projectMember.update({
      where: { id: memberId },
      data: { role },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json({ member: updated })
  } catch (err) {
    console.error('[api/projects/[id]/members/[memberId] PATCH]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; memberId: string }> }
) {
  const { projectId, memberId } = await params
  try {
    const session = await auth.api.getSession({ headers: req.headers })
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const callerMember = await db.projectMember.findFirst({
      where: { userId: session.user.id, projectId },
    })
    if (!callerMember) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const target = await db.projectMember.findFirst({ where: { id: memberId, projectId } })
    if (!target) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

    // Members can remove themselves; admins/owners can remove others (except owner)
    const isSelf = target.userId === session.user.id
    const isAdminOrOwner = ['owner', 'admin'].includes(callerMember.role)

    if (!isSelf && !isAdminOrOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (target.role === 'owner' && !isSelf) {
      return NextResponse.json({ error: 'Cannot remove owner' }, { status: 403 })
    }

    await db.projectMember.delete({ where: { id: memberId } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/projects/[id]/members/[memberId] DELETE]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
