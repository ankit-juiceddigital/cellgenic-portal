// File: src/lib/api.ts
//
// Every call the new portal makes. Two families:
//   cg()  → WordPress cellgenic/v1, browser → WP, user's own JWT
//   next() → our own /api/* routes, which hold the WooCommerce secrets
//
// The old lib/woocommerce.ts mixed a browser-safe cgFetch with a
// server-only wcFetch in ONE module that client pages imported, so the
// WC key/secret path got bundled into the browser. That split is now
// physical: nothing in this file touches WC_CONSUMER_*.

const WP_URL = process.env.NEXT_PUBLIC_WP_URL

async function cg<T>(endpoint: string, token: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${WP_URL}/wp-json/cellgenic/v1${endpoint}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
    cache: 'no-store',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || `API error ${res.status}`)
  }
  return res.json()
}

async function next<T>(path: string, token?: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
      ...init.headers,
    },
    cache: 'no-store',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || err.message || `Request failed (${res.status})`)
  }
  return res.json()
}

// ─────────────────────────────────────────────
// READS
// ─────────────────────────────────────────────
export const getPortalClients = (token: string) =>
  cg<{ clients: any[]; scope: string; server_now: string; window_days: number }>('/portal-clients', token)

export const getPendingProviders = (token: string) =>
  cg<any[]>('/pending-providers', token)

export const getReps = (token: string) =>
  cg<any[]>('/reps', token)

export const getClientEvents = (token: string, id: number) =>
  cg<any[]>(`/client-events/${id}`, token)

export const getRevealCount = (token: string) =>
  cg<{ today: number }>('/reveal-count', token)

export const getNotes = (token: string, clientId: number) =>
  cg<any[]>(`/notes?client_id=${clientId}`, token)

export const getAllOrders = (token: string, customerIds: number[], unrestricted: boolean) => {
  const params = new URLSearchParams()
  if (unrestricted) params.set('mode', 'all')
  if (customerIds.length) params.set('customers', customerIds.join(','))
  return next<{ orders: any[]; usedFallback: boolean }>(`/api/orders/all?${params}`, token)
}

export const getClientDetails = (token: string, id: number) =>
  cg<any>(`/client-details/${id}`, token)

// ─────────────────────────────────────────────
// WRITES
// ─────────────────────────────────────────────
export const setStage = (token: string, userId: number, stage: string) =>
  cg<{ success: boolean; stage: string }>('/set-stage', token, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, stage }),
  })

/**
 * `days` may be negative to remove a previously granted extension. The
 * server floors the running total at zero and returns `extra_days` (the
 * new total) plus `applied` (what actually changed after the floor).
 */
export const extendWindow = (token: string, userId: number, days: number) =>
  cg<{ success: boolean; extra_days: number; applied: number }>('/extend-window', token, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, days }),
  })

export const bulkAssign = (token: string, userIds: number[], repCode: string) =>
  cg<{ success: boolean; assigned: number; skipped: number[] }>('/bulk-assign', token, {
    method: 'POST',
    body: JSON.stringify({ user_ids: userIds, rep_code: repCode }),
  })

export const logReveal = (token: string, userId: number, field: 'phone' | 'email' | 'both') =>
  cg<{ success: boolean; today: number }>('/log-reveal', token, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, field }),
  })

export const approveProvider = (token: string, userId: number) =>
  cg<any>('/approve-provider', token, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId }),
  })

export const rejectProvider = (token: string, userId: number) =>
  cg<any>('/reject-provider', token, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId }),
  })

export const saveNote = (
  token: string,
  note: { clientId: number; text: string; type: string; author: string },
) =>
  cg<any>('/notes', token, {
    method: 'POST',
    body: JSON.stringify({
      client_id: note.clientId, text: note.text, type: note.type, author: note.author,
    }),
  })

export const deactivateClient = (token: string, userId: number) =>
  cg<any>('/deactivate-client', token, {
    method: 'POST', body: JSON.stringify({ user_id: userId }),
  })

export const reactivateClient = (token: string, userId: number) =>
  cg<any>('/reactivate-client', token, {
    method: 'POST', body: JSON.stringify({ user_id: userId }),
  })
