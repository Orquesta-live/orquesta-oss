import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getIO } from '@/lib/socket'
import { hashToken } from '@/lib/utils'
import { auth } from '@/lib/auth'

// Agent PATCHes this to update prompt status
// Dashboard GETs this to fetch a single prompt + logs
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ promptId: string }> }
) {
  const { promptId } = await params
  try {
    const session = await auth.api.getSession({ headers: req.headers })
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const prompt = await db.prompt.findFirst({
      where: { id: promptId },
      include: {
        logs: { orderBy: { sequence: 'asc' } },
        user: { select: { id: true, name: true, email: true } },
      },
    })

    if (!prompt) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Verify the user is a member of the project that owns this prompt
    const member = await db.projectMember.findFirst({
      where: { userId: session.user.id, projectId: prompt.projectId },
    })
    if (!member) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json(prompt)
  } catch (err) {
    console.error('[api/prompts/[promptId] GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ promptId: string }> }
) {
  const { promptId } = await params
  try {
    // Accepts both agent token (X-Agent-Token) and session (dashboard)
    const rawToken = req.headers.get('x-agent-token') || ''
    let projectId: string | null = null

    if (rawToken) {
      const tokenHash = hashToken(rawToken)
      const agentToken = await db.agentToken.findFirst({
        where: { tokenHash, revokedAt: null },
      })
      if (!agentToken) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
      }
      projectId = agentToken.projectId
    } else {
      const session = await auth.api.getSession({ headers: req.headers })
      if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const body = await req.json()
    const { status, result, error, tokensUsed, costCents } = body

    const prompt = await db.prompt.update({
      where: { id: promptId },
      data: {
        ...(status && { status }),
        ...(result !== undefined && { result }),
        ...(error !== undefined && { error }),
        ...(tokensUsed !== undefined && { tokensUsed }),
        ...(costCents !== undefined && { costCents }),
        ...(status === 'running' && { startedAt: new Date() }),
        ...((status === 'completed' || status === 'failed') && { completedAt: new Date() }),
      },
    })

    // Notify dashboard via Socket.io
    try {
      const io = getIO()
      io.to(`project-${prompt.projectId}`).emit('prompt:update', {
        promptId,
        status: prompt.status,
        tokensUsed: prompt.tokensUsed,
        costCents: prompt.costCents,
      })
    } catch {
      // Socket.io not available
    }

    return NextResponse.json(prompt)
  } catch (err) {
    console.error('[api/prompts/[promptId] PATCH]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
