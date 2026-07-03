'use client'
// File: src/components/layout/RouteGuard.tsx
// Second layer of protection — wraps any page that needs role restriction.
// The middleware handles cookie-level protection; this handles client-side.

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import type { AuthUser } from '@/lib/auth'

interface RouteGuardProps {
  allowedRoles: AuthUser['role'][]
  children: React.ReactNode
}

export function RouteGuard({ allowedRoles, children }: RouteGuardProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user && !allowedRoles.includes(user.role)) {
      router.replace('/dashboard')
    }
  }, [user, loading, allowedRoles, router])

  // Still loading — show nothing
  if (loading) return null

  // Not logged in — show nothing (middleware handles redirect)
  if (!user) return null

  // Wrong role — show nothing while redirect happens
  if (!allowedRoles.includes(user.role)) return null

  return <>{children}</>
}
