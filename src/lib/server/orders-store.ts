// File: src/lib/server/orders-store.ts
//
// SERVER-ONLY. Imported by the /api/orders/* route handlers — never by a
// 'use client' file (it reads WC_CONSUMER_KEY / SECRET).
//
// ─────────────────────────────────────────────────────────────────────
// WHY THIS EXISTS
// ─────────────────────────────────────────────────────────────────────
// Every portal load, tab focus and 3-minute poll used to re-download the
// ENTIRE order history from WooCommerce (up to 20 sequential pages, or
// one request chain per client). That is what made Orders take 8-10s.
//
// This keeps one in-memory copy of the orders and keeps it fresh with an
// INCREMENTAL sync instead of re-downloading:
//
//   1. Cold start      → one full download (pages fetched in PARALLEL,
//                         with `_fields` so WooCommerce skips everything
//                         the portal never reads).
//   2. Every request   → a tiny "what changed since last time?" call
//                         (`modified_after`). New orders, status changes,
//                         refunds etc. show up on the very next request.
//                         Throttled to once per few seconds so ten open
//                         tabs don't cause ten calls.
//   3. Every 10 min    → a full re-sync in the BACKGROUND (the request
//                         that triggers it is still answered instantly
//                         from memory). This is only there to catch
//                         orders that were permanently deleted, which a
//                         "changed since" query can never report.
//   4. Order placed    → /api/orders POST pushes the new order straight
//      via the portal     into the store, so it's visible immediately.
//
// So the cache never serves "old" orders: it always asks WooCommerce what
// changed before answering. It only avoids re-downloading what didn't.
//
// FALLBACK: some WC API keys may not list the whole order collection
// unfiltered ("Sorry, you cannot list resources"). In that case this
// falls back to per-customer fetching (same as before, but pages are
// parallel and each customer's list is cached for a short TTL and
// invalidated whenever the portal places an order for that customer).
//
// NOTE ON HOSTING: the store is per server instance (module memory). On
// Vercel/serverless each warm instance keeps its own copy and syncs
// independently, so every instance is still fresh — a cold instance just
// pays one full download, which is still much faster than before.

const WC_URL = process.env.NEXT_PUBLIC_WC_URL
const WC_KEY = process.env.WC_CONSUMER_KEY
const WC_SECRET = process.env.WC_CONSUMER_SECRET
const WP_URL = process.env.NEXT_PUBLIC_WP_URL

// ─────────────────────────────────────────────
// TUNING
// ─────────────────────────────────────────────
const PER_PAGE = 100
/** Safety cap for the full sync (100 × 100 = 10,000 orders). */
const MAX_FULL_PAGES = 100
/** Parallel requests to WooCommerce at once — gentle on the WP server. */
const CONCURRENCY = 6
/** Requests arriving within this window reuse the last delta sync. */
const DELTA_MIN_INTERVAL_MS = 5_000
/** Background full re-sync (catches permanently deleted orders). */
const FULL_RESYNC_MS = 10 * 60_000
/**
 * The delta asks for orders modified since (last seen − overlap). A wide
 * overlap makes this correct even on older WooCommerce versions that
 * ignore `dates_are_gmt` and read the date in the site's timezone. It
 * only costs a slightly bigger delta response. Safe to reduce to a few
 * minutes if the store runs WooCommerce ≥ 5.8.
 */
const DELTA_OVERLAP_MS = 26 * 60 * 60_000
/** If the unfiltered listing was refused, re-check after this long. */
const UNRESTRICTED_RECHECK_MS = 30 * 60_000
/** Fallback (per-customer) cache lifetime. */
const CUSTOMER_TTL_MS = 30_000
/** Auth lookups: token → role, and a rep's own client IDs. */
const CALLER_TTL_MS = 60_000
const MY_CLIENTS_TTL_MS = 20_000

/**
 * Only the top-level fields any /api/orders/* mapper actually reads.
 * WordPress core applies `_fields` to every REST response, WooCommerce
 * included — this drops _links, addresses, taxes, refunds, fee lines…
 * which is most of the payload.
 */
const FIELDS = [
  'id', 'number', 'customer_id', 'billing', 'date_created', 'date_modified_gmt',
  'status', 'total', 'payment_method', 'payment_method_title',
  'meta_data', 'line_items', 'shipping_lines',
].join(',')

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
/** A WooCommerce order trimmed to what the portal uses. Same shape/keys
 *  as the raw WC object, so the existing route mappers work unchanged. */
export type SlimOrder = {
  id: number
  number: string
  customer_id: number
  billing: { first_name?: string; last_name?: string; company?: string; country?: string }
  date_created: string
  date_modified_gmt?: string
  status: string
  total: string
  payment_method?: string
  payment_method_title?: string
  meta_data: { key: string; value: any }[]
  line_items: { name: string; sku?: string; quantity: number; total: string; subtotal?: string }[]
  shipping_lines: { method_title?: string; total?: string }[]
}

type Store = {
  orders: Map<number, SlimOrder>
  /** Newest date_modified_gmt seen (ms). */
  cursor: number
  lastFullSync: number
  lastDelta: number
  unrestricted: boolean | null
  unrestrictedCheckedAt: number
  fullInFlight: Promise<void> | null
  deltaInFlight: Promise<void> | null
  perCustomer: Map<string, { orders: SlimOrder[]; at: number; inFlight?: Promise<SlimOrder[]> }>
  callers: Map<string, { value: any; at: number }>
  myClients: Map<string, { value: Set<string>; at: number }>
}

// Kept on globalThis so Next's dev-mode hot reload doesn't wipe it.
const g = globalThis as unknown as { __cgOrdersStore?: Store }
const store: Store = g.__cgOrdersStore ??= {
  orders: new Map(),
  cursor: 0,
  lastFullSync: 0,
  lastDelta: 0,
  unrestricted: null,
  unrestrictedCheckedAt: 0,
  fullInFlight: null,
  deltaInFlight: null,
  perCustomer: new Map(),
  callers: new Map(),
  myClients: new Map(),
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function wcHeaders() {
  const credentials = Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64')
  return { Authorization: `Basic ${credentials}` }
}

function gmtMs(s?: string): number {
  if (!s) return 0
  const t = Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : `${s}Z`)
  return Number.isFinite(t) ? t : 0
}

function toWcDate(ms: number) {
  // WooCommerce wants ISO8601 without milliseconds.
  return new Date(ms).toISOString().replace(/\.\d{3}Z$/, '')
}

function slim(o: any): SlimOrder {
  return {
    id: o.id,
    number: o.number,
    customer_id: o.customer_id,
    billing: {
      first_name: o.billing?.first_name,
      last_name: o.billing?.last_name,
      company: o.billing?.company,
      country: o.billing?.country,
    },
    date_created: o.date_created,
    date_modified_gmt: o.date_modified_gmt,
    status: o.status,
    total: o.total,
    payment_method: o.payment_method,
    payment_method_title: o.payment_method_title,
    meta_data: (o.meta_data || [])
      .filter((m: any) => m.key === '_placed_by_rep')
      .map((m: any) => ({ key: m.key, value: m.value })),
    line_items: (o.line_items || []).map((i: any) => ({
      name: i.name, sku: i.sku, quantity: i.quantity, total: i.total, subtotal: i.subtotal,
    })),
    shipping_lines: (o.shipping_lines || []).map((s: any) => ({
      method_title: s.method_title, total: s.total,
    })),
  }
}

function byDateDesc(a: SlimOrder, b: SlimOrder) {
  return new Date(b.date_created).getTime() - new Date(a.date_created).getTime()
}

/** Runs `tasks` with at most `limit` in flight at once. */
async function pool<T>(tasks: (() => Promise<T>)[], limit = CONCURRENCY): Promise<T[]> {
  const results: T[] = new Array(tasks.length)
  let next = 0
  async function worker() {
    while (next < tasks.length) {
      const i = next++
      results[i] = await tasks[i]()
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker))
  return results
}

type PageResult = { ok: true; orders: any[] } | { ok: false }

async function fetchPage(query: string, page: number): Promise<PageResult & { totalPages?: number }> {
  const url = `${WC_URL}/wp-json/wc/v3/orders?${query}&per_page=${PER_PAGE}&page=${page}&_fields=${FIELDS}`
  try {
    const res = await fetch(url, { headers: wcHeaders(), cache: 'no-store' })
    if (!res.ok) return { ok: false }
    const orders = await res.json()
    const totalPages = Number(res.headers.get('x-wp-totalpages') || 0) || undefined
    return { ok: true, orders: Array.isArray(orders) ? orders : [], totalPages }
  } catch {
    return { ok: false }
  }
}

/**
 * Page 1 first (it tells us how many pages exist), then all remaining
 * pages in parallel. Returns null if page 1 itself was refused.
 * `complete` is false if a later page failed.
 */
async function fetchAllPages(query: string, maxPages: number) {
  const first = await fetchPage(query, 1)
  if (!first.ok) return null
  let orders = first.orders
  let complete = true

  if (first.orders.length === PER_PAGE) {
    // If the header is missing, walk sequentially like before.
    if (!first.totalPages) {
      for (let p = 2; p <= maxPages; p++) {
        const r = await fetchPage(query, p)
        if (!r.ok) { complete = false; break }
        orders = orders.concat(r.orders)
        if (r.orders.length < PER_PAGE) break
      }
    } else {
      const last = Math.min(first.totalPages, maxPages)
      const tasks = []
      for (let p = 2; p <= last; p++) tasks.push(() => fetchPage(query, p))
      const pages = await pool(tasks)
      for (const r of pages) {
        if (r.ok) orders = orders.concat(r.orders)
        else complete = false
      }
    }
  }
  return { orders, complete }
}

// ─────────────────────────────────────────────
// GLOBAL (unfiltered) STORE
// ─────────────────────────────────────────────
function ingest(raw: any[]) {
  for (const o of raw) {
    if (!o || typeof o.id !== 'number') continue
    const s = slim(o)
    store.orders.set(s.id, s)
    const m = gmtMs(s.date_modified_gmt)
    if (m > store.cursor) store.cursor = m
  }
}

async function fullSync() {
  const startedAt = Date.now()
  const result = await fetchAllPages('orderby=date&order=desc', MAX_FULL_PAGES)
  store.unrestrictedCheckedAt = Date.now()

  if (result === null) {
    // WC key isn't allowed to list unfiltered → use the fallback path.
    if (store.orders.size === 0) store.unrestricted = false
    return
  }
  store.unrestricted = true

  // A partial download must not wipe a good store (a missing page would
  // make real orders "disappear" for 10 minutes). Only replace when the
  // download is complete, or when we have nothing better.
  if (result.complete || store.orders.size === 0) {
    const fresh = new Map<number, SlimOrder>()
    let cursor = 0
    for (const o of result.orders) {
      const s = slim(o)
      fresh.set(s.id, s)
      cursor = Math.max(cursor, gmtMs(s.date_modified_gmt))
    }
    // Anything that changed while the download was running is newer in
    // the old map — keep whichever copy was modified later.
    for (const [id, old] of store.orders) {
      const f = fresh.get(id)
      const oldMod = gmtMs(old.date_modified_gmt)
      if (f) {
        if (oldMod > gmtMs(f.date_modified_gmt)) fresh.set(id, old)
      } else if (oldMod >= startedAt - 60_000 || (store.lastFullSync && oldMod > store.lastFullSync)) {
        // Arrived (or was pushed by upsertOrder) after page 1 was read —
        // it's real, the download just started too early to include it.
        fresh.set(id, old)
      }
    }
    store.orders = fresh
    store.cursor = Math.max(cursor, store.cursor)
    store.lastFullSync = Date.now()
    store.lastDelta = Date.now()
  } else {
    ingest(result.orders)
  }
}

async function deltaSync() {
  const since = toWcDate(Math.max(0, store.cursor - DELTA_OVERLAP_MS))
  const base = `modified_after=${encodeURIComponent(since)}&dates_are_gmt=true&orderby=date&order=desc`

  const [changed, trashed] = await Promise.all([
    fetchAllPages(base, 20),
    // Orders moved to the bin — drop them. (Ignored if WC refuses.)
    fetchAllPages(`${base}&status=trash`, 5),
  ])

  if (changed) ingest(changed.orders)
  if (trashed) for (const o of trashed.orders) store.orders.delete(o.id)
  store.lastDelta = Date.now()
}

function runFull() {
  if (!store.fullInFlight) {
    store.fullInFlight = fullSync().finally(() => { store.fullInFlight = null })
  }
  return store.fullInFlight
}

function runDelta() {
  if (!store.deltaInFlight) {
    store.deltaInFlight = deltaSync()
      .catch(() => { /* keep serving what we have */ })
      .finally(() => { store.deltaInFlight = null })
  }
  return store.deltaInFlight
}

/**
 * Returns the freshest copy of every order, or null when the WC key can't
 * list orders unfiltered (caller must use the per-customer fallback).
 */
async function getGlobalOrders(): Promise<SlimOrder[] | null> {
  const now = Date.now()

  if (store.unrestricted === false) {
    if (now - store.unrestrictedCheckedAt < UNRESTRICTED_RECHECK_MS) return null
    store.unrestricted = null // time to try again
  }

  if (store.unrestricted === null || (store.orders.size === 0 && store.lastFullSync === 0)) {
    // Cold start: nothing to serve yet, so this one request waits.
    await runFull()
    if (store.unrestricted !== true) return null
  } else {
    // Warm: always pick up what changed before answering.
    if (now - store.lastDelta >= DELTA_MIN_INTERVAL_MS || store.deltaInFlight) {
      await runDelta()
    }
    // Deleted-order cleanup happens in the background; don't wait.
    if (now - store.lastFullSync >= FULL_RESYNC_MS) {
      runFull().catch(() => {})
    }
  }

  return Array.from(store.orders.values()).sort(byDateDesc)
}

// ─────────────────────────────────────────────
// PER-CUSTOMER FALLBACK
// ─────────────────────────────────────────────
async function fetchCustomer(id: string, maxPages: number): Promise<SlimOrder[]> {
  // Keyed by page cap too, so a 1-page read never stands in for a 5-page one.
  const key = `${id}:${maxPages}`
  const hit = store.perCustomer.get(key)
  if (hit && Date.now() - hit.at < CUSTOMER_TTL_MS) return hit.orders
  if (hit?.inFlight) return hit.inFlight

  const inFlight = (async () => {
    const result = await fetchAllPages(`customer=${encodeURIComponent(id)}&orderby=date&order=desc`, maxPages)
    // Same as before: a customer that errors is skipped, not fatal —
    // but the failure isn't cached, so the next request retries it.
    if (!result) {
      store.perCustomer.delete(key)
      return hit?.orders || []
    }
    const orders = result.orders.map(slim)
    store.perCustomer.set(key, { orders, at: Date.now() })
    return orders
  })()
  store.perCustomer.set(key, { orders: hit?.orders || [], at: hit?.at || 0, inFlight })
  try {
    return await inFlight
  } catch {
    store.perCustomer.delete(key)
    return []
  }
}

async function fetchCustomers(ids: string[], maxPages: number) {
  const lists = await pool(ids.map(id => () => fetchCustomer(id, maxPages)), 10)
  return lists.flat()
}

// ─────────────────────────────────────────────
// PUBLIC API — used by the route handlers
// ─────────────────────────────────────────────

/**
 * mode=all (admin). Returns null if the unfiltered listing isn't
 * permitted, so the route falls back exactly as it did before.
 * `cap` keeps the previous "newest 2000" limit on this listing.
 */
export async function getAllOrdersUnrestricted(cap = 2000): Promise<SlimOrder[] | null> {
  const all = await getGlobalOrders()
  return all ? all.slice(0, cap) : null
}

/**
 * Every order for the given customer IDs, newest first.
 * `perCustomerPages` preserves each route's old per-customer page cap
 * on the fallback path.
 */
export async function getOrdersForCustomers(ids: string[], perCustomerPages = 5): Promise<SlimOrder[]> {
  if (!ids.length) return []
  const all = await getGlobalOrders()
  if (all) {
    const wanted = new Set(ids.map(String))
    return all.filter(o => wanted.has(String(o.customer_id)))
  }
  const list = await fetchCustomers(ids, perCustomerPages)
  return list.sort(byDateDesc)
}

/** Called after the portal creates/changes an order — visible instantly. */
export function upsertOrder(rawWcOrder: any) {
  if (!rawWcOrder || typeof rawWcOrder.id !== 'number') return
  if (store.unrestricted === true) ingest([rawWcOrder])
  // Fallback cache: just forget that customer so the next read refetches.
  if (rawWcOrder.customer_id != null) {
    const prefix = `${rawWcOrder.customer_id}:`
    for (const k of Array.from(store.perCustomer.keys())) if (k.startsWith(prefix)) store.perCustomer.delete(k)
  }
}

// ─────────────────────────────────────────────
// AUTH LOOKUPS (short-lived)
// ─────────────────────────────────────────────
// Every orders request used to make 1-2 extra WordPress round trips
// before even starting (users/me, and my-clients for reps). With the
// portal polling, that's the same answer fetched over and over. These
// are cached per token for a short time only — role changes and newly
// assigned clients still apply within a minute.

function prune<V>(m: Map<string, { value: V; at: number }>, ttl: number) {
  if (m.size < 500) return
  const now = Date.now()
  for (const [k, v] of m) if (now - v.at > ttl) m.delete(k)
}

export async function getCallerCached<T>(token: string, load: (t: string) => Promise<T>): Promise<T> {
  const hit = store.callers.get(token)
  if (hit && Date.now() - hit.at < CALLER_TTL_MS) return hit.value as T
  const value = await load(token) // throws on invalid token — not cached
  prune(store.callers, CALLER_TTL_MS)
  store.callers.set(token, { value, at: Date.now() })
  return value
}

/** A sales rep's own client IDs (as strings), from /my-clients. */
export async function getMyClientIdsCached(token: string): Promise<Set<string>> {
  const hit = store.myClients.get(token)
  if (hit && Date.now() - hit.at < MY_CLIENTS_TTL_MS) return hit.value
  const res = await fetch(`${WP_URL}/wp-json/cellgenic/v1/my-clients`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  const myClients = res.ok ? await res.json() : []
  const value = new Set<string>((myClients || []).map((c: any) => String(c.id)))
  // Don't cache a failed lookup — try again next request.
  if (res.ok) {
    prune(store.myClients, MY_CLIENTS_TTL_MS)
    store.myClients.set(token, { value, at: Date.now() })
  }
  return value
}
