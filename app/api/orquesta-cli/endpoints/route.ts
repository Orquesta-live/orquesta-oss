import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashToken } from '@/lib/utils'

// orquesta-cli fetches LLM endpoint configs from dashboard
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

    const endpoints = cliToken.llmEndpoints ? JSON.parse(cliToken.llmEndpoints) : []
    return NextResponse.json({ endpoints })
  } catch (err) {
    console.error('[api/orquesta-cli/endpoints]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
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
    const { endpoints } = body

    await db.cliToken.update({
      where: { id: cliToken.id },
      data: { llmEndpoints: JSON.stringify(endpoints) },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/orquesta-cli/endpoints PUT]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
