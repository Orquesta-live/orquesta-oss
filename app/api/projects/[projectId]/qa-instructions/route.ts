import { NextResponse } from 'next/server'

// Stub — OSS doesn't have QA instructions (paid feature)
export async function GET() {
  return NextResponse.json({ instructions: null })
}

export async function PATCH() {
  return NextResponse.json({ success: true })
}
