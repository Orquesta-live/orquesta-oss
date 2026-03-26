import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const member = await db.projectMember.findFirst({
    where: { userId: session.user.id, projectId },
  })
  if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { claudeMd: true },
  })

  return NextResponse.json({ claudeMd: project?.claudeMd || '' })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const member = await db.projectMember.findFirst({
    where: { userId: session.user.id, projectId },
  })
  if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!['owner', 'admin'].includes(member.role)) {
    return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
  }

  const body = await req.json()
  const { claudeMd } = body

  await db.project.update({
    where: { id: projectId },
    data: { claudeMd: claudeMd ?? null },
  })

  return NextResponse.json({ success: true })
}
