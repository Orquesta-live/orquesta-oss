import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getIO } from '@/lib/socket'
import { hashToken } from '@/lib/utils'
import { auth } from '@/lib/auth'

// Dashboard calls this to execute a prompt — emits Socket.io event to the agent
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers })
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { promptId, projectId } = body

    if (!promptId || !projectId) {
      return NextResponse.json({ error: 'promptId and projectId required' }, { status: 400 })
    }

    const prompt = await db.prompt.findFirst({
      where: { id: promptId, projectId },
    })

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 })
    }

    // Update prompt to running
    await db.prompt.update({
      where: { id: promptId },
      data: { status: 'running', startedAt: new Date() },
    })

    // Emit execute event to agents in this project room
    try {
      const io = getIO()
      io.to(`project-${projectId}`).emit('execute', {
        promptId,
        content: prompt.content,
      })
    } catch {
      // Socket.io may not be initialized in test environments
      console.warn('[api/agent/execute] Socket.io not available')
    }

    return NextResponse.json({ ok: true, promptId })
  } catch (err) {
    console.error('[api/agent/execute]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
