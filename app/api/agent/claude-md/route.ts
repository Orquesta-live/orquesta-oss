import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import crypto from 'crypto'

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

// Agent fetches CLAUDE.md for its project
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tokenHash = hashToken(token)
  const agentToken = await db.agentToken.findFirst({
    where: { tokenHash, revokedAt: null },
    include: { project: { select: { claudeMd: true } } },
  })

  if (!agentToken) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  return NextResponse.json({ claudeMd: agentToken.project.claudeMd || '' })
}
