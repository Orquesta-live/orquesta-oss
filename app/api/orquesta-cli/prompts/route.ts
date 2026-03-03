import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashToken } from '@/lib/utils'

// orquesta-cli: list prompt history + create prompts via CLI
export async function GET(req: NextRequest) {
  try {
    const rawToken = req.headers.get('authorization')?.replace('Bearer ', '') || ''
    if (!rawToken) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 })
    }

    const tokenHash = hashToken(rawToken)
    const cliToken = await db.cliToken.findFirst({
      where: { tokenHash, revokedAt: null },
    })

    if (!cliToken) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const url = new URL(req.url)
    const projectId = url.searchParams.get('projectId')
    const limit = parseInt(url.searchParams.get('limit') || '50', 10)

    const prompts = await db.prompt.findMany({
      where: {
        userId: cliToken.userId,
        ...(projectId && { projectId }),
        source: 'cli',
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        content: true,
        status: true,
        result: true,
        tokensUsed: true,
        costCents: true,
        createdAt: true,
        completedAt: true,
        project: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ prompts })
  } catch (err) {
    console.error('[api/orquesta-cli/prompts GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const rawToken = req.headers.get('authorization')?.replace('Bearer ', '') || ''
    if (!rawToken) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 })
    }

    const tokenHash = hashToken(rawToken)
    const cliToken = await db.cliToken.findFirst({
      where: { tokenHash, revokedAt: null },
    })

    if (!cliToken) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await req.json()
    const { projectId, content } = body

    if (!projectId || !content) {
      return NextResponse.json({ error: 'projectId and content required' }, { status: 400 })
    }

    // Verify user is member of project
    const member = await db.projectMember.findFirst({
      where: { userId: cliToken.userId, projectId },
    })
    if (!member) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const prompt = await db.prompt.create({
      data: {
        projectId,
        userId: cliToken.userId,
        content,
        source: 'cli',
        status: 'pending',
      },
    })

    return NextResponse.json({ prompt }, { status: 201 })
  } catch (err) {
    console.error('[api/orquesta-cli/prompts POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
