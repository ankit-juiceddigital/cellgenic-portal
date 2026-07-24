'use client'

// File: src/app/auth/login/page.tsx

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { loginWithWordPress, type AuthUser } from '@/lib/auth'
import { useAuth } from '@/lib/auth-context'
import Image from 'next/image'
import { Eye, EyeOff, ShieldCheck, Users } from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // Holds the authenticated-but-not-yet-finalized user while we wait for
  // them to pick Administrator or Sales Manager. Set for any
  // administrator login — see auth.ts for why this doesn't require the
  // account to hold a second WP role.
  const [pendingRoleChoice, setPendingRoleChoice] = useState<AuthUser | null>(null)

  const finishLogin = (user: AuthUser) => {
    login(user)
    const redirect = searchParams.get('redirect')
    if (redirect && redirect !== '/auth/login') {
      router.push(redirect)
    } else {
      router.push('/dashboard')
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await loginWithWordPress(username, password)
      if (user.availableRoles && user.availableRoles.length > 1) {
        // Administrator + Sales Manager on the same account — ask which
        // one they want for this session instead of silently defaulting.
        setPendingRoleChoice(user)
      } else {
        finishLogin(user)
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  if (pendingRoleChoice) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4 py-8"
        style={{ background: '#f5f5f3', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
      >
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <Image
              src="https://cellgenic.com/wp-content/uploads/2026/05/cellgenic_official_logo_black.png"
              alt="CellGenic"
              width={140}
              height={36}
              style={{ objectFit: 'contain', display: 'inline-block' }}
              unoptimized
            />
          </div>
          <div className="bg-white p-8" style={{ borderRadius: 20, border: '0.5px solid #e8e8e4' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0a0a0a', letterSpacing: '-0.02em', marginBottom: 4, textAlign: 'center' }}>
              Continue as…
            </h2>
            <p style={{ fontSize: 13, color: '#888', marginBottom: 24, lineHeight: 1.5, textAlign: 'center' }}>
              Choose which functionality to use for this session.
            </p>
            <div className="space-y-2">
              <button
                onClick={() => finishLogin({ ...pendingRoleChoice, role: 'administrator' })}
                className="w-full flex items-center gap-3 text-left transition-colors"
                style={{ padding: '14px 16px', border: '1px solid #e8e8e4', borderRadius: 12, background: '#fff', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#0F6E56')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#e8e8e4')}
              >
                <span style={{ width: 36, height: 36, borderRadius: 10, background: '#f0f9f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ShieldCheck size={18} color="#0F6E56" />
                </span>
                <span>
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#0a0a0a' }}>Administrator</span>
                  <span style={{ display: 'block', fontSize: 12, color: '#999' }}>Full platform management</span>
                </span>
              </button>
              <button
                onClick={() => finishLogin({ ...pendingRoleChoice, role: 'sales_manager' })}
                className="w-full flex items-center gap-3 text-left transition-colors"
                style={{ padding: '14px 16px', border: '1px solid #e8e8e4', borderRadius: 12, background: '#fff', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#0F6E56')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#e8e8e4')}
              >
                <span style={{ width: 36, height: 36, borderRadius: 10, background: '#f0f9f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Users size={18} color="#0F6E56" />
                </span>
                <span>
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#0a0a0a' }}>Sales Manager</span>
                  <span style={{ display: 'block', fontSize: 12, color: '#999' }}>Rep performance & client oversight</span>
                </span>
              </button>
            </div>
            <button
              onClick={() => setPendingRoleChoice(null)}
              style={{ marginTop: 16, width: '100%', background: 'none', border: 'none', fontSize: 13, color: '#999', cursor: 'pointer' }}
            >
              ← Back to sign in
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{ background: '#f5f5f3', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
    >
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <Image
            src="https://cellgenic.com/wp-content/uploads/2026/05/cellgenic_official_logo_black.png"
            alt="CellGenic"
            width={140}
            height={36}
            style={{ objectFit: 'contain', display: 'inline-block' }}
            unoptimized
          />
        </div>

        {/* Card */}
        <div
          className="bg-white p-8"
          style={{ borderRadius: 20, border: '0.5px solid #e8e8e4' }}
        >
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0a0a0a', letterSpacing: '-0.02em', marginBottom: 4, textAlign: 'center' }}>
            Sign in
          </h2>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 28, lineHeight: 1.5, textAlign: 'center' }}>
            Provider Sales Portal — team access only.
          </p>

          <form onSubmit={handleLogin} className="space-y-3">

            {/* Username */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#555', marginBottom: 5 }}>
                Username or email
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="your.name@stemcellsgroup.com"
                required
                autoComplete="username"
                className="w-full focus:outline-none"
                style={{
                  padding: '11px 14px',
                  border: '1px solid #e8e8e4',
                  borderRadius: 10,
                  fontSize: 14,
                  color: '#0a0a0a',
                  background: '#ffffff',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
                onFocus={e => { e.target.style.borderColor = '#0F6E56'; e.target.style.background = '#fff' }}
                onBlur={e => { e.target.style.borderColor = '#e8e8e4'; e.target.style.background = '#ffffff' }}
              />
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#555', marginBottom: 5 }}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full focus:outline-none"
                  style={{
                    padding: '11px 42px 11px 14px',
                    border: '1px solid #e8e8e4',
                    borderRadius: 10,
                    fontSize: 14,
                    color: '#0a0a0a',
                    background: '#ffffff',
                    fontFamily: 'inherit',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#0F6E56'; e.target.style.background = '#fff' }}
                  onBlur={e => { e.target.style.borderColor = '#e8e8e4'; e.target.style.background = '#ffffff' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: '#bbb', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#555')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#bbb')}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#dc2626' }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2"
              style={{
                marginTop: 4,
                background: '#0a0a0a',
                backgroundColor: '#0a0a0a',
                color: '#ffffff',
                border: 'none',
                borderRadius: 10,
                padding: '13px',
                fontSize: 14,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                opacity: 1,
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#222222')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#0a0a0a')}
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                <>Sign in <span style={{ fontSize: 16 }}>→</span></>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-2" style={{ margin: '18px 0' }}>
            <div style={{ flex: 1, height: '0.5px', background: '#e8e8e4' }} />
            <span style={{ fontSize: 11, color: '#bbb', whiteSpace: 'nowrap' }}>forgot your password?</span>
            <div style={{ flex: 1, height: '0.5px', background: '#e8e8e4' }} />
          </div>

          {/* Reset password — always visible */}
          <a
            href="https://cellgenic.com/wp-login.php?action=lostpassword"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 transition-all"
            style={{
              background: '#fff',
              color: '#555',
              border: '1px solid #e8e8e4',
              borderRadius: 10,
              padding: '11px 14px',
              fontSize: 13,
              fontWeight: 500,
              textDecoration: 'none',
              fontFamily: 'inherit',
              display: 'flex',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#0a0a0a'; e.currentTarget.style.color = '#0a0a0a' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e8e8e4'; e.currentTarget.style.color = '#555' }}
          >
            <span style={{ width: 18, height: 18, background: '#0a0a0a', borderRadius: 4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: '#fff', fontFamily: 'monospace', flexShrink: 0 }}>W</span>
            Reset password via WordPress
          </a>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-1.5 mt-5">
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0F6E56', flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: '#bbb' }}>Access restricted to CellGenic team members</span>
        </div>

      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ background: '#f5f5f3' }}>
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#0F6E56', borderTopColor: 'transparent' }} />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
