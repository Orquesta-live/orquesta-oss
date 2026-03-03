import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashToken } from '@/lib/utils'

// orquesta-cli calls this to list projects accessible to the user
export async function GET(req: NextRequest) {
  try {
    const rawToken = req.headers.get('authorization')?.replace('Bearer ', '') || ''
    if (!rawToken) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 })
    }

    const tokenHash = hashToken(rawToken)
    const cliToken = await db.cliToken.findFirst({
      where: { tokenHash, revokedAt: null },
      include: { user: true },
    })

    if (!cliToken) {
      return NextResponse.json({ error: 'Invalid or revoked CLI token' }, { status: 401 })
    }

    const members = await db.projectMember.findMany({
      where: { userId: cliToken.userId },
      include: {
        project: {
          include: {
            _count: { select: { prompts: true, members: true } },
          },
        },
      },
      orderBy: { project: { createdAt: 'desc' } },
    })

    const projects = members.map((m) => ({
      id: m.project.id,
      name: m.project.name,
      description: m.project.description,
      role: m.role,
      promptCount: m.project._count.prompts,
      memberCount: m.project._count.members,
      createdAt: m.project.createdAt,
    }))

    return NextResponse.json({ projects })
  } catch (err) {
    console.error('[api/orquesta-cli/projects]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
