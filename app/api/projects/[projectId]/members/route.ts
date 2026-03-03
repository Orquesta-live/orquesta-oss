import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  try {
    const session = await auth.api.getSession({ headers: req.headers })
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const callerMember = await db.projectMember.findFirst({
      where: { userId: session.user.id, projectId },
    })
    if (!callerMember) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const members = await db.projectMember.findMany({
      where: { projectId },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
      orderBy: { joinedAt: 'asc' },
    })

    return NextResponse.json({ members, callerRole: callerMember.role })
  } catch (err) {
    console.error('[api/projects/[id]/members GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Invite a user by email
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  try {
    const session = await auth.api.getSession({ headers: req.headers })
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const callerMember = await db.projectMember.findFirst({
      where: { userId: session.user.id, projectId },
    })
    if (!callerMember || !['owner', 'admin'].includes(callerMember.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { email, role = 'member' } = body

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    if (!['member', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role. Use member or admin' }, { status: 400 })
    }

    const user = await db.user.findFirst({ where: { email } })
    if (!user) {
      return NextResponse.json({ error: 'User not found. They must sign up first.' }, { status: 404 })
    }

    const existing = await db.projectMember.findFirst({
      where: { userId: user.id, projectId },
    })
    if (existing) {
      return NextResponse.json({ error: 'User is already a member' }, { status: 409 })
    }

    const member = await db.projectMember.create({
      data: { userId: user.id, projectId, role },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    })

    return NextResponse.json({ member }, { status: 201 })
  } catch (err) {
    console.error('[api/projects/[id]/members POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
