'use client'

// File: src/app/auth/login/page.tsx

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { loginWithWordPress } from '@/lib/auth'
import { useAuth } from '@/lib/auth-context'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const user = await loginWithWordPress(username, password)

      // Save to context + cookies
      login(user)

      // Redirect to original destination or role-based default
      const redirect = searchParams.get('redirect')
      if (redirect && redirect !== '/auth/login') {
        router.push(redirect)
      } else {
        router.push('/dashboard')
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-brand rounded-xl mb-4">
            <span className="text-white font-bold text-lg">C</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">CellGenic</h1>
          <p className="text-sm text-gray-400 mt-1">Provider Sales Portal</p>
        </div>

        {/* Login card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-5">
            Sign in to your account
          </h2>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Username */}
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">
                Username or Email
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="your.name"
                required
                autoComplete="username"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:border-brand transition-colors"
              />
            </div>

            {/* Password */}
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 pr-10 bg-white focus:outline-none focus:border-brand transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-xs text-red-600">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full bg-brand text-white text-sm font-medium py-2.5 rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-1"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-4">
            Access restricted to CellGenic sales team members.
          </p>
        </div>

        <p className="text-xs text-gray-400 text-center mt-4">
          Forgot your password?{' '}
          <a
            href="https://cellgenic.com/wp-login.php?action=lostpassword"
            target="_blank"
            className="text-brand hover:underline"
          >
            Reset via WordPress
          </a>
        </p>
      </div>
    </div>
  )
}
