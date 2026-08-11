import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login']
// /uploads saiu da lista: as fotos de especie agora vivem no banco e sao
// servidas por /api/fotos/[id], que o matcher abaixo ja exclui.
const PUBLIC_PREFIXES = ['/_next', '/icons', '/sw.js', '/manifest']

// Deve casar com SESSION_COOKIE em src/lib/auth.ts (prefixo __Host- em producao).
const SESSION_COOKIE =
  process.env.NODE_ENV === 'production' ? '__Host-session_token' : 'session_token'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next()
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next()

  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value
  if (!sessionToken) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
