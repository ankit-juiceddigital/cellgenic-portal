// File: src/middleware.ts
//
// Cookie-level route protection. Kept in sync with the nav in
// Sidebar.tsx — the old build had two divergent copies of this list and
// /calculator fell through the gap, redirecting everyone to /dashboard.
//
// IMPORTANT: the role cookie is set with document.cookie, so it is not
// httpOnly and a determined user can edit it. This gate is UX, not
// security. Every API route re-derives the caller's role from the
// WordPress JWT — see the audit notes.

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Every route any signed-in user may reach. /clients covers /clients/vip
// and /clients/[id] by prefix.
const SHARED = [
  '/dashboard', '/activation', '/clients', '/orders', '/approvals',
  '/leaderboard', '/calculator', '/referral', '/order', '/commissions',
]

const ALLOWED_ROUTES: Record<string, string[]> = {
  sales_rep: SHARED,
  sales_manager: [...SHARED, '/reps'],
  administrator: [...SHARED, '/reps', '/unassigned', '/inventory', '/settings'],
}

const PUBLIC_ROUTES = ['/auth/login', '/auth/register']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    PUBLIC_ROUTES.some(r => pathname.startsWith(r)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  const role = request.cookies.get('cellgenic_role')?.value
  const token = request.cookies.get('cellgenic_token')?.value

  if (!token || !role) {
    const url = new URL('/auth/login', request.url)
    // Preserve where they were headed so login can send them back —
    // the login page already reads ?redirect.
    if (pathname !== '/') url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  const allowed = ALLOWED_ROUTES[role] || []
  const ok = allowed.some(a => pathname === a || pathname.startsWith(a + '/'))

  if (!ok) return NextResponse.redirect(new URL('/dashboard', request.url))

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
}
