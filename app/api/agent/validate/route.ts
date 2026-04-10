import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashToken } from '@/lib/utils'

// orquesta-agent calls this on startup to validate its token
// Response tells it which transport to use (socketio for OSS)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const rawToken: string = body.token

    if (!rawToken) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 })
    }

    const tokenHash = hashToken(rawToken)
    const agentToken = await db.agentToken.findFirst({
      where: { tokenHash, revokedAt: null },
      include: { project: true },
    })

    if (!agentToken) {
      return NextResponse.json({ error: 'Invalid or revoked token' }, { status: 401 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    return NextResponse.json({
      valid: true,
      transport: 'socketio',
      socketUrl: appUrl,
      wsUrl: appUrl,
      wsPath: '/api/socket',
      projectId: agentToken.projectId,
      projectName: agentToken.project.name,
      agentTokenId: agentToken.id,
    })
  } catch (err) {
    console.error('[api/agent/validate]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
