// ─────────────────────────────────────────────────────────────────────
// CellGenic Portal — WordPress JWT Authentication
// File: src/lib/auth.ts
//
// HOW TO SET UP JWT ON WORDPRESS:
// 1. Install plugin: "JWT Authentication for WP REST API"
//    https://wordpress.org/plugins/jwt-authentication-for-wp-rest-api/
//
// 2. Add these lines to your WordPress wp-config.php:
//    define('JWT_AUTH_SECRET_KEY', 'your-secret-key-here-make-it-long-and-random');
//    define('JWT_AUTH_CORS_ENABLE', true);
//
// 3. Add these lines to your .htaccess file (above # BEGIN WordPress):
//    RewriteEngine on
//    RewriteCond %{HTTP:Authorization} ^(.*)
//    RewriteRule ^(.*) - [E=HTTP_AUTHORIZATION:%1]
//    SetEnvIf Authorization "(.*)" HTTP_AUTHORIZATION=$1
//
// 4. Add to your Next.js .env.local:
//    NEXT_PUBLIC_WP_URL=https://your-staging-url.hostingersite.com
//    JWT_SECRET=your-secret-key-here-make-it-long-and-random
//
// ─────────────────────────────────────────────────────────────────────

const WP_URL = process.env.NEXT_PUBLIC_WP_URL

export interface AuthUser {
  token: string
  userId: number
  email: string
  name: string
  role: 'sales_rep' | 'sales_manager' | 'administrator'
  repCode?: string
}

// ─────────────────────────────────────────────
// LOGIN — exchange WP credentials for JWT token
// ─────────────────────────────────────────────
export async function loginWithWordPress(
  username: string,
  password: string
): Promise<AuthUser> {
  const res = await fetch(`${WP_URL}/wp-json/jwt-auth/v1/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.message || 'Invalid username or password.')
  }

  const data = await res.json()

  // Get user role and rep code from WP
  const userDetails = await getWordPressUserDetails(data.token)

  return {
    token: data.token,
    userId: userDetails.id,
    email: userDetails.email,
    name: userDetails.name,
    role: userDetails.role,
    repCode: userDetails.repCode,
  }
}

// ─────────────────────────────────────────────
// GET USER DETAILS — role, rep code etc.
// ─────────────────────────────────────────────
async function getWordPressUserDetails(token: string) {
  const res = await fetch(`${WP_URL}/wp-json/wp/v2/users/me?context=edit`, {
    headers: { 'Authorization': `Bearer ${token}` },
  })

  if (!res.ok) throw new Error('Could not fetch user details.')

  const user = await res.json()

  // Determine role
  let role: AuthUser['role'] = 'sales_rep'
  if (user.roles.includes('administrator')) role = 'administrator'
  else if (user.roles.includes('sales_manager')) role = 'sales_manager'
  else if (user.roles.includes('sales_rep')) role = 'sales_rep'

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role,
    repCode: user.meta?.cellgenic_rep_code || null,
  }
}

// ─────────────────────────────────────────────
// VALIDATE TOKEN — check if still valid
// ─────────────────────────────────────────────
export async function validateToken(token: string): Promise<boolean> {
  try {
    const res = await fetch(`${WP_URL}/wp-json/jwt-auth/v1/token/validate`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    })
    const data = await res.json()
    return data.code === 'jwt_auth_valid_token'
  } catch {
    return false
  }
}

// ─────────────────────────────────────────────
// SESSION HELPERS — store/retrieve from localStorage
// ─────────────────────────────────────────────
const SESSION_KEY = 'cellgenic_auth'

export function saveSession(user: AuthUser) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user))
  }
}

export function getSession(): AuthUser | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(SESSION_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

export function clearSession() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_KEY)
  }
}
