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

  // On mount — restore session from localStorage and validate token
  useEffect(() => {
    async function restoreSession() {
      const stored = getSession()
      if (!stored) {
        setLoading(false)
        return
      }
      // Validate the token is still good
      const valid = await validateToken(stored.token)
      if (valid) {
        setUser(stored)
      } else {
        // Token expired — clear and redirect to login
        clearSession()
        router.push('/auth/login')
      }
      setLoading(false)
    }
    restoreSession()
  }, [])

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
