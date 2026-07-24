// File: src/lib/auth.ts
// Full auth helpers — login, session, cookies, token validation

const WP_URL = process.env.NEXT_PUBLIC_WP_URL

export interface AuthUser {
  token: string
  userId: number
  email: string
  name: string
  initials: string
  role: 'sales_rep' | 'sales_manager' | 'administrator'
  repCode?: string
  // Only set when the WordPress account holds BOTH 'administrator' and
  // 'sales_manager' roles — lets the login screen ask which one to use
  // for this session, rather than always defaulting to Administrator.
  availableRoles?: ('administrator' | 'sales_manager')[]
}

// ─────────────────────────────────────────────
// LOGIN
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
  const userDetails = await getWordPressUserDetails(data.token)

  // WordPress's default Users screen only lets you assign ONE role per
  // account, so requiring the account to literally hold both
  // 'administrator' and 'sales_manager' would never trigger for anyone.
  // Instead: any administrator gets asked which functionality to use for
  // this session — Administrator (full platform) or Sales Manager (rep
  // performance & client oversight) — since admins should be able to use
  // either view without needing a second WP role assigned.
  const isAdministrator = userDetails.roles.includes('administrator')

  return {
    token: data.token,
    userId: userDetails.id,
    email: userDetails.email,
    name: userDetails.name,
    initials: getInitials(userDetails.name),
    role: userDetails.role,
    repCode: userDetails.repCode,
    availableRoles: isAdministrator ? ['administrator', 'sales_manager'] : undefined,
  }
}

// ─────────────────────────────────────────────
// GET USER DETAILS FROM WP
// ─────────────────────────────────────────────
export async function getWordPressUserDetails(token: string) {
  const res = await fetch(`${WP_URL}/wp-json/wp/v2/users/me?context=edit`, {
    headers: { 'Authorization': `Bearer ${token}` },
  })

  if (!res.ok) throw new Error('Could not fetch user details.')

  const user = await res.json()

  let role: AuthUser['role'] = 'sales_rep'
  if (user.roles?.includes('administrator')) role = 'administrator'
  else if (user.roles?.includes('sales_manager')) role = 'sales_manager'
  else if (user.roles?.includes('sales_rep')) role = 'sales_rep'

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role,
    roles: (user.roles || []) as string[],
    repCode: user.meta?.cellgenic_rep_code || null,
  }
}

// ─────────────────────────────────────────────
// VALIDATE TOKEN
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
// SESSION — localStorage + cookies
// ─────────────────────────────────────────────
const SESSION_KEY = 'cellgenic_auth'

export function saveSession(user: AuthUser) {
  if (typeof window === 'undefined') return

  // Save to localStorage for client-side use
  localStorage.setItem(SESSION_KEY, JSON.stringify(user))

  // Save token + role to cookies so middleware can read them
  const expires = new Date()
  expires.setDate(expires.getDate() + 7) // 7 day session
  const cookieOptions = `expires=${expires.toUTCString()}; path=/; SameSite=Strict`
  document.cookie = `cellgenic_token=${user.token}; ${cookieOptions}`
  document.cookie = `cellgenic_role=${user.role}; ${cookieOptions}`
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
  if (typeof window === 'undefined') return
  localStorage.removeItem(SESSION_KEY)
  // Clear cookies
  document.cookie = 'cellgenic_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/'
  document.cookie = 'cellgenic_role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/'
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function getRoleLabel(role: AuthUser['role']): string {
  const labels: Record<AuthUser['role'], string> = {
    sales_rep: 'Sales Representative',
    sales_manager: 'Sales Manager',
    administrator: 'Platform Administrator',
  }
  return labels[role] || role
}
