import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashToken } from '@/lib/utils'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const rawToken: string = body.token || req.headers.get('x-agent-token') || ''

    if (!rawToken) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 })
    }

    const tokenHash = hashToken(rawToken)
    const agentToken = await db.agentToken.findFirst({
      where: { tokenHash, revokedAt: null },
    })

    if (!agentToken) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    await db.agentToken.update({
      where: { id: agentToken.id },
      data: { lastSeenAt: new Date() },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/agent/heartbeat]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
