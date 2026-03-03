import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashToken } from '@/lib/utils'

// Bidirectional config sync for orquesta-cli
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
    const { localEndpoints } = body

    // Merge local endpoints with stored endpoints
    const storedEndpoints = cliToken.llmEndpoints ? JSON.parse(cliToken.llmEndpoints) : []

    // Simple merge: local wins for existing IDs, append new ones
    const mergedMap = new Map<string, unknown>()
    for (const ep of storedEndpoints) {
      mergedMap.set((ep as { id: string }).id, ep)
    }
    for (const ep of (localEndpoints || [])) {
      mergedMap.set((ep as { id: string }).id, ep)
    }
    const merged = Array.from(mergedMap.values())

    await db.cliToken.update({
      where: { id: cliToken.id },
      data: { llmEndpoints: JSON.stringify(merged) },
    })

    return NextResponse.json({ endpoints: merged, synced: true })
  } catch (err) {
    console.error('[api/orquesta-cli/config/sync]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
