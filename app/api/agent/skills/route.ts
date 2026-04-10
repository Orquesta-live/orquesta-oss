import { NextResponse } from 'next/server'

// Stub: OSS doesn't have skill injection (yet)
// Returns empty skills so the agent doesn't error
export async function GET() {
  return NextResponse.json({ skills: {}, claudeMd: '', skillCount: 0 })
}
