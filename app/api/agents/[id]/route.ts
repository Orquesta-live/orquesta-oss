import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'

// DELETE: Revoke an agent token
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // Verify user has access to this token's project
  const token = await db.agentToken.findUnique({
    where: { id },
    select: { projectId: true },
  })

  if (!token) {
    return NextResponse.json({ error: 'Token not found' }, { status: 404 })
  }

  const membership = await db.projectMember.findFirst({
    where: { userId: session.user.id, projectId: token.projectId },
  })

  if (!membership) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  // Revoke the token
  await db.agentToken.update({
    where: { id },
    data: { revokedAt: new Date() },
  })

  return NextResponse.json({ success: true })
}
