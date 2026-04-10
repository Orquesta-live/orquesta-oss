import { NextResponse } from 'next/server'

// Stub: OSS doesn't have credential injection (yet)
// Returns empty credentials so the agent doesn't error
export async function GET() {
  return NextResponse.json({ credentials: {} })
}
