import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login', '/signup', '/api/auth']

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Always allow public paths and API routes
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.') // static assets
  ) {
    return NextResponse.next()
  }

  // Check for Better Auth session cookie
  const sessionCookie =
    req.cookies.get('better-auth.session_token') ||
    req.cookies.get('__Secure-better-auth.session_token')

  if (!sessionCookie && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Root: show landing page for guests, redirect to dashboard for logged-in users
  if (pathname === '/') {
    if (sessionCookie) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api/socket|_next/static|_next/image|favicon.ico).*)'],
}
