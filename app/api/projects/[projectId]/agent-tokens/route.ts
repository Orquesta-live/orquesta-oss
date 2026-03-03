import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { generateToken, hashToken } from '@/lib/utils'

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

    const tokens = await db.agentToken.findMany({
      where: { projectId, revokedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        lastSeenAt: true,
        createdAt: true,
        // tokenHash is never returned — only the raw token is shown once at creation
      },
    })

    return NextResponse.json({ tokens })
  } catch (err) {
    console.error('[api/projects/[id]/agent-tokens GET]', err)
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
    if (!member || !['owner', 'admin'].includes(member.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const name = body.name?.trim() || 'Default'

    const rawToken = generateToken('oat')
    const tokenHash = hashToken(rawToken)

    const token = await db.agentToken.create({
      data: { projectId, name, tokenHash },
    })

    // Raw token shown once — never stored in plaintext
    return NextResponse.json({
      token: {
        id: token.id,
        name: token.name,
        rawToken, // only returned at creation
        createdAt: token.createdAt,
      },
    }, { status: 201 })
  } catch (err) {
    console.error('[api/projects/[id]/agent-tokens POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
