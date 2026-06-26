'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Role } from '@/types'

interface ProtectedRouteProps {
  children: React.ReactNode
  // Optional: restrict to specific roles
  allowedRoles?: Role[]
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    // Not logged in — go to login
    if (!user) {
      router.push('/auth/login')
      return
    }

    // Logged in but wrong role for this page
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      router.push('/dashboard')
    }
  }, [user, loading, allowedRoles])

  // Show nothing while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Not authenticated
  if (!user) return null

  // Wrong role
  if (allowedRoles && !allowedRoles.includes(user.role)) return null

  return <>{children}</>
}
