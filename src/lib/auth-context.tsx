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

  // On mount — restore session from localStorage immediately, and
  // validate the token in the background rather than blocking on it.
  //
  // The previous version awaited validateToken() (a round trip to
  // WordPress's jwt-auth/v1/token/validate) before setting `user` or
  // flipping `loading` false — and ProtectedRoute renders NOTHING
  // until `loading` is false, so every single page load, even a plain
  // refresh, paid that ~2s network round trip as pure blank-screen
  // time before the rest of the app could even start fetching data.
  // The token is almost always still valid within a session, so we now
  // trust the cached session optimistically and only react if
  // validation comes back negative.
  useEffect(() => {
    const stored = getSession()
    if (!stored) {
      setLoading(false)
      return
    }

    setUser(stored)
    setLoading(false)

    validateToken(stored.token).then(valid => {
      if (!valid) {
        // Token actually expired — clear and bounce to login.
        clearSession()
        setUser(null)
        router.push('/auth/login')
      }
    })
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