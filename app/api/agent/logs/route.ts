import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getIO } from '@/lib/socket'
import { hashToken } from '@/lib/utils'

interface LogEntry {
  promptId: string
  level: string
  type: string
  message: string
  sequence: number
}

// Agent can POST a batch of logs (fallback REST path, primary is Socket.io)
export async function POST(req: NextRequest) {
  try {
    const rawToken = req.headers.get('x-agent-token') || ''
    if (!rawToken) {
      return NextResponse.json({ error: 'x-agent-token header required' }, { status: 401 })
    }

    const tokenHash = hashToken(rawToken)
    const agentToken = await db.agentToken.findFirst({
      where: { tokenHash, revokedAt: null },
    })

    if (!agentToken) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await req.json()
    const logs: LogEntry[] = Array.isArray(body) ? body : [body]

    await db.agentLog.createMany({
      data: logs.map((log) => ({
        promptId: log.promptId,
        level: log.level || 'info',
        type: log.type || 'text',
        message: log.message,
        sequence: log.sequence || 0,
      })),
    })

    // Forward to dashboard via Socket.io
    try {
      const io = getIO()
      for (const log of logs) {
        io.to(`project-${agentToken.projectId}`).emit('log', log)
      }
    } catch {
      // Socket.io not available
    }

    return NextResponse.json({ ok: true, count: logs.length })
  } catch (err) {
    console.error('[api/agent/logs]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
