// File: src/middleware.ts
// Protects all dashboard routes based on user role stored in cookies.
// If a Sales Rep tries to manually visit /approvals — they get redirected to /dashboard.

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ─────────────────────────────────────────────
// ROUTES EACH ROLE IS ALLOWED TO ACCESS
// Must match the ALLOWED_ROUTES in Sidebar.tsx
// ─────────────────────────────────────────────
const ALLOWED_ROUTES: Record<string, string[]> = {
  sales_rep: [
    '/dashboard', '/clients', '/order', '/orders', '/approvals', '/calculator',
    '/leaderboard', '/commissions', '/referral',
  ],
  sales_manager: [
    '/dashboard', '/clients', '/order', '/reps',
    '/orders', '/leaderboard', '/commissions',
  ],
  administrator: [
    '/dashboard', '/clients', '/reps', '/unassigned',
    '/approvals', '/orders', '/inventory', '/commissions', '/settings',
  ],
}

// Routes that don't need auth at all
const PUBLIC_ROUTES = ['/auth/login', '/auth/register']

// Routes that need auth but not a specific role (any logged-in user)
const SHARED_ROUTES = ['/calculator', '/leaderboard', '/order', '/clients']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip public routes and Next.js internals
  if (
    PUBLIC_ROUTES.some(r => pathname.startsWith(r)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  // Read role from cookie (set during login in auth.ts)
  const role = request.cookies.get('cellgenic_role')?.value
  const token = request.cookies.get('cellgenic_token')?.value

  // Not logged in — redirect to login
  if (!token || !role) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Check if this role is allowed to access this route
  const allowedForRole = ALLOWED_ROUTES[role] || []

  // Check if the current path starts with any allowed route
  const isAllowed = allowedForRole.some(
    allowed => pathname === allowed || pathname.startsWith(allowed + '/')
  )

  // If not allowed — redirect to dashboard
  if (!isAllowed) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  // Run middleware on all routes except static files and api routes
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
}
