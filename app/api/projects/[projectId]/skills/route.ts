import { NextResponse } from 'next/server'

// Stub — OSS doesn't have skills (paid feature)
export async function GET() {
  return NextResponse.json({ skills: [] })
}
