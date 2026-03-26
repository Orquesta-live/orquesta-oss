import { NextResponse } from 'next/server'

// Stub — OSS doesn't have credential vault (paid feature)
export async function GET() {
  return NextResponse.json({ credentials: [] })
}

export async function DELETE() {
  return NextResponse.json({ error: 'Not available in OSS' }, { status: 404 })
}
