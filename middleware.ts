// File: middleware.ts (place in root of Next.js project, same level as package.json)
//
// This runs on every request BEFORE the page loads.
// It checks if the user has a valid session cookie.
// If not, it redirects to login immediately — no flash of protected content.

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/auth/login',
  '/auth/forgot-password',
]

// Routes that require specific roles
const ROLE_RESTRICTED: Record<string, string[]> = {
  '/unassigned':  ['administrator'],
  '/approvals':   ['administrator', 'sales_manager'],
  '/settings':    ['administrator'],
  '/reps':        ['administrator', 'sales_manager'],
  '/referral':    ['sales_rep'],
  '/order':       ['sales_rep'],
  '/calculator':  ['sales_rep'],
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes through
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Allow static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Check for auth token in cookies
  const token = request.cookies.get('cellgenic_token')?.value
  const roleStr = request.cookies.get('cellgenic_role')?.value

  // No token — redirect to login
  if (!token) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Check role restrictions
  const restrictedRoles = ROLE_RESTRICTED[pathname]
  if (restrictedRoles && roleStr && !restrictedRoles.includes(roleStr)) {
    // User doesn't have permission for this page — redirect to dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
