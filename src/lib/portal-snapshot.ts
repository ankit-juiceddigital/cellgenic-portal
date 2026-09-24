// File: src/lib/portal-snapshot.ts
//
// Browser-only helpers (safe to import anywhere — every function checks
// for `window`). Used by PortalProvider for instant paint, and by
// clearSession() so logout wipes the snapshot.

// ─────────────────────────────────────────────
// INSTANT-PAINT SNAPSHOT (stale-while-revalidate)
// ─────────────────────────────────────────────
// The last good API responses are kept in sessionStorage. On a reload or
// a "Place another order" refresh, the portal paints from them straight
// away and then refreshes silently in the background — so the screen is
// never blank, and anything new (orders, clients, approvals) replaces
// the snapshot a moment later, exactly like a silent poll.
//
// sessionStorage, not localStorage, on purpose: this holds client
// contact data, so it lives only as long as the tab and is never written
// to disk long-term. It is keyed per user + role (an admin switching to
// the Sales Manager view never sees the other view's data) and wiped on
// logout. Raw API responses are stored, so dates and the 30-day window
// are recomputed fresh on every paint.
const SNAP_PREFIX = 'cg_portal_snap:'
const SNAP_VERSION = 1
/** Anything older than this is ignored rather than shown. */
const SNAP_MAX_AGE_MS = 12 * 60 * 60 * 1000

export type Snapshot = {
  savedAt: number
  clients?: any[]
  orders?: any[]
  approvals?: any[]
  reps?: any[]
  revealCount?: number
}

export function snapKey(userId?: number, role?: string) {
  return userId && role ? `${SNAP_PREFIX}v${SNAP_VERSION}:${userId}:${role}` : null
}

// In-memory mirror, so each write doesn't re-parse the stored JSON.
const snapMem = new Map<string, Snapshot>()

export function readSnap(key: string | null): Snapshot | null {
  if (!key || typeof window === 'undefined') return null
  const mem = snapMem.get(key)
  if (mem) return Date.now() - mem.savedAt > SNAP_MAX_AGE_MS ? null : mem
  try {
    const raw = window.sessionStorage.getItem(key)
    if (!raw) return null
    const snap = JSON.parse(raw) as Snapshot
    if (!snap?.savedAt || Date.now() - snap.savedAt > SNAP_MAX_AGE_MS) return null
    snapMem.set(key, snap)
    return snap
  } catch {
    return null
  }
}

export function writeSnap(key: string | null, patch: Partial<Snapshot>) {
  if (!key || typeof window === 'undefined') return
  const next: Snapshot = { ...(readSnap(key) || {}), ...patch, savedAt: Date.now() }
  snapMem.set(key, next)
  try {
    window.sessionStorage.setItem(key, JSON.stringify(next))
  } catch {
    // Quota exceeded / private mode — the snapshot is a nicety, never required.
  }
}

/** Called on logout so the next person on this browser starts clean. */
export function clearPortalSnapshots() {
  snapMem.clear()
  if (typeof window === 'undefined') return
  try {
    const ss = window.sessionStorage
    for (let i = ss.length - 1; i >= 0; i--) {
      const k = ss.key(i)
      if (k && k.startsWith(SNAP_PREFIX)) ss.removeItem(k)
    }
  } catch { /* ignore */ }
}

/** Fired after the portal places an order, so lists refresh right away. */
export const ORDERS_CHANGED_EVENT = 'cg:orders-changed'
