import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

// Used by client pages to get session data including token (for Socket.io auth)
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers })
    if (!session) return NextResponse.json({ session: null })

    return NextResponse.json({
      session: {
        token: session.session.token,
        user: {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
        },
      },
    })
  } catch {
    return NextResponse.json({ session: null })
  }
}
