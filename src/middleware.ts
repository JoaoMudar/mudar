import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login']
const PUBLIC_PREFIXES = ['/_next', '/icons', '/sw.js', '/manifest', '/uploads']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next()
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next()

  const sessionToken = request.cookies.get('session_token')?.value
  if (!sessionToken) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
