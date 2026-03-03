import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers })
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const members = await db.projectMember.findMany({
      where: { userId: session.user.id },
      include: {
        project: {
          include: {
            _count: { select: { prompts: true, members: true, agentTokens: true } },
            agentTokens: {
              where: { revokedAt: null },
              select: { lastSeenAt: true },
              take: 1,
              orderBy: { lastSeenAt: 'desc' },
            },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    })

    const projects = members.map((m) => {
      const latestSeen = m.project.agentTokens[0]?.lastSeenAt
      const agentOnline = latestSeen
        ? Date.now() - new Date(latestSeen).getTime() < 30000
        : false

      return {
        id: m.project.id,
        name: m.project.name,
        description: m.project.description,
        role: m.role,
        agentOnline,
        promptCount: m.project._count.prompts,
        memberCount: m.project._count.members,
        tokenCount: m.project._count.agentTokens,
        createdAt: m.project.createdAt,
      }
    })

    return NextResponse.json({ projects })
  } catch (err) {
    console.error('[api/projects GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers })
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { name, description } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Project name required' }, { status: 400 })
    }

    const project = await db.project.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        members: {
          create: {
            userId: session.user.id,
            role: 'owner',
          },
        },
      },
    })

    return NextResponse.json({ project }, { status: 201 })
  } catch (err) {
    console.error('[api/projects POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
