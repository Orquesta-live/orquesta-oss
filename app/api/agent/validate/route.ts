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

    const appUrl = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/[^/]*$/, '') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    // For the socket URL, use the request's own host so the agent connects back here
    const host = req.headers.get('host') || 'localhost:3000'
    const proto = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https')
    const selfUrl = `${proto}://${host}`

    return NextResponse.json({
      valid: true,
      transport: 'socketio',
      socketUrl: selfUrl,
      wsUrl: selfUrl,
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
