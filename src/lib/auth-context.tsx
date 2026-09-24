'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { AuthUser, getSession, saveSession, clearSession, validateToken } from '@/lib/auth'

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  login: (user: AuthUser) => void
  logout: () => void
  isRep: boolean
  isManager: boolean
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // On mount, restore the locally saved session immediately so protected
  // pages can start rendering/fetching without waiting on a separate WP
  // validation round trip. The token is still validated in the background,
  // and every protected API call independently verifies it server-side.
  useEffect(() => {
    let cancelled = false

    async function restoreSession() {
      const stored = getSession()
      if (!stored) {
        setLoading(false)
        return
      }

      setUser(stored)
      setLoading(false)

      const valid = await validateToken(stored.token)
      if (!valid && !cancelled) {
        clearSession()
        setUser(null)
        router.replace('/auth/login')
      }
    }

    restoreSession()
    return () => { cancelled = true }
  }, [router])

  const login = (userData: AuthUser) => {
    saveSession(userData)
    setUser(userData)
  }

  const logout = () => {
    clearSession()
    setUser(null)
    router.push('/auth/login')
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      isRep: user?.role === 'sales_rep',
      isManager: user?.role === 'sales_manager',
      isAdmin: user?.role === 'administrator',
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
