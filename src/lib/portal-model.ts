// File: src/lib/portal-model.ts
//
// Every derived number in the portal comes from here, so the 30-day
// window is defined in exactly one place. Ported from the approved
// prototype's recompute()/STAGE/GROUPS block — the thresholds (5 days
// urgent, 15 days warn, 30-day window) are the design's, unchanged.

import type {
  Approval, Bucket, Order, Provider, Rep, RepStats, Stage,
} from '@/types/portal'

export const WINDOW_DAYS = 30
export const URGENT_AT = 5   // days left or fewer → urgent
export const WARN_AT = 15    // days left or fewer → closing soon
export const PER_PAGE = 25   // rows per group before "Show N more"

// ─────────────────────────────────────────────
// DATES
// The prototype hardcoded TODAY = 28 Aug 2026. Live it is the real
// date, normalised to local midnight so day counts don't drift by the
// time of day the page happens to be open.
// ─────────────────────────────────────────────
export function today(): Date {
  const n = new Date()
  return new Date(n.getFullYear(), n.getMonth(), n.getDate())
}

export const dayDiff = (a: Date, b: Date) =>
  Math.round((b.getTime() - a.getTime()) / 864e5)

export const addDays = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)

export const fmt = (d: Date) =>
  d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })

export const fmtShort = (d: Date) =>
  d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' })

export const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US')

export const initials = (name: string) =>
  name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()

/** Parses whatever the WP/WC APIs hand back, including nulls. */
export function parseDate(v: unknown): Date | null {
  if (!v) return null
  const d = new Date(v as string)
  return isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

// ─────────────────────────────────────────────
// STAGES
// ─────────────────────────────────────────────
export const STAGE: Record<Stage, { t: string; k: string; act: string; next: Stage }> = {
  new:    { t: 'Not contacted', k: 'p-new',    act: 'Call now',            next: 'cont' },
  cont:   { t: 'Contacted',     k: 'p-cont',   act: 'Send quote',          next: 'quote' },
  quote:  { t: 'Quote sent',    k: 'p-quote',  act: 'Follow up',           next: 'quote' },
  noresp: { t: 'No response',   k: 'p-noresp', act: 'Second call',         next: 'cont' },
  act:    { t: 'Activated',     k: 'p-act',    act: 'Log contact',         next: 'act' },
  dead:   { t: 'Expired',       k: 'p-dead',   act: 'Reactivate account',  next: 'new' },
}
export const STAGE_KEYS = Object.keys(STAGE) as Stage[]

export const GROUPS: { k: Bucket; t: string; col: string; sub: string }[] = [
  { k: 'urg',  t: 'Urgent — closing in 5 days or less', col: 'var(--clay)',  sub: 'Call today' },
  { k: 'warn', t: 'Closing soon — 6 to 15 days left',   col: 'var(--amber)', sub: 'Schedule follow-up' },
  { k: 'ok',   t: 'In window — access just granted',    col: 'var(--slate)', sub: 'Welcome and assign' },
  { k: 'act',  t: 'Activated — first order placed',     col: 'var(--jade)',  sub: 'Retain' },
  { k: 'dead', t: 'Expired — 30 days with no order',    col: '#9B9FA5',      sub: 'Reactivation campaign' },
]

/** Pipeline (kanban) columns and the day each stage is due by. */
export const PIPE_COLUMNS: [Stage, string][] = [
  ['new', 'day 0–2'], ['cont', 'day 3'], ['quote', 'day 10'], ['noresp', 'day 15'], ['act', '—'],
]

// ─────────────────────────────────────────────
// WOOCOMMERCE STATUS → DISPLAY LABEL
// The prototype invented four labels. WooCommerce ships different ones,
// so this is the mapping layer. NOTE: which WC status means "In transit"
// is a business decision — 'completed' is used for Delivered here, and
// anything unmapped falls through to a title-cased raw status rather
// than being silently mislabelled. Confirm with Sarah/Rafa.
// ─────────────────────────────────────────────
export const ORDER_STATUS: Record<string, { t: string; k: string }> = {
  'pending':    { t: 'Awaiting payment', k: 'p-noresp' },
  'on-hold':    { t: 'Awaiting payment', k: 'p-noresp' },
  'failed':     { t: 'Payment failed',   k: 'p-dead' },
  'processing': { t: 'Preparing',        k: 'p-cont' },
  'shipped':    { t: 'In transit',       k: 'p-quote' },
  'completed':  { t: 'Delivered',        k: 'p-act' },
  'cancelled':  { t: 'Cancelled',        k: 'p-dead' },
  'refunded':   { t: 'Refunded',         k: 'p-dead' },
}
export function orderStatus(raw: string) {
  return ORDER_STATUS[raw] || {
    t: raw.replace(/-/g, ' ').replace(/^\w/, c => c.toUpperCase()),
    k: 'p-new',
  }
}

// ─────────────────────────────────────────────
// COUNTRY FLAGS
// billing_country is already ISO-2, so the flag is generated from the
// code rather than kept in a lookup table that has to be extended for
// every new market. Falls back to '' when the code is missing.
// ─────────────────────────────────────────────
export function flag(cc?: string | null): string {
  if (!cc || cc.length !== 2) return ''
  const up = cc.toUpperCase()
  if (!/^[A-Z]{2}$/.test(up)) return ''
  return String.fromCodePoint(...[...up].map(c => 0x1f1e6 + c.charCodeAt(0) - 65))
}

/** Country display name from an ISO-2 code, when the API only gives the code. */
export function countryName(cc?: string | null, fallback = ''): string {
  if (!cc || cc.length !== 2) return fallback
  try {
    const dn = new Intl.DisplayNames(['en'], { type: 'region' })
    return dn.of(cc.toUpperCase()) || fallback || cc
  } catch {
    return fallback || cc
  }
}

// ─────────────────────────────────────────────
// PII MASKING
// The design masks contact details until an explicit reveal, and logs
// every reveal. These two helpers only produce the masked string — the
// logging is in useReveals().
// ─────────────────────────────────────────────
export function maskPhone(p: string): string {
  if (!p) return '—'
  const head = p.slice(0, Math.max(4, p.length - 7)).replace(/\d(?=\d{2})/g, '•')
  return head + ' ••• ••' + p.slice(-2)
}
export function maskEmail(e: string): string {
  if (!e || !e.includes('@')) return '—'
  const [local, domain] = e.split('@')
  return (local[0] || '') + '•••@' + domain
}

// ─────────────────────────────────────────────
// THE WINDOW
// ─────────────────────────────────────────────
/**
 * Recomputes elapsed / left / closes / bucket, and forces `stage` where
 * the window itself decides it (ordered → act, expired → dead). Mirrors
 * the prototype's recompute() exactly.
 *
 * A provider with no access-granted date sits outside the window
 * entirely: bucket 'ok' with left = WINDOW_DAYS so it never shows up as
 * urgent on missing data. Backfill on the WP side fixes these.
 */
export function enrich(list: Provider[], now = today()): Provider[] {
  return list.map((x, i) => {
    const p: Provider = { ...x, i }

    if (!p.acc) {
      p.elapsed = 0
      p.left = WINDOW_DAYS
      p.closes = null
    } else {
      p.elapsed = dayDiff(p.acc, now)
      p.closes = addDays(p.acc, WINDOW_DAYS + (p.extendedDays || 0))
      p.left = dayDiff(now, p.closes)
    }

    if (p.orders > 0) { p.bucket = 'act'; p.stage = 'act' }
    else if (p.acc && p.left <= 0) { p.bucket = 'dead'; p.stage = 'dead' }
    else if (p.left <= URGENT_AT) p.bucket = 'urg'
    else if (p.left <= WARN_AT) p.bucket = 'warn'
    else p.bucket = 'ok'

    return p
  })
}

/** The 30 tick marks under each row. Returns fill flags, not markup. */
export function ticks(x: Provider): { filled: boolean; now: boolean }[] {
  const capped = Math.min(Math.max(x.elapsed, 0), WINDOW_DAYS)
  return Array.from({ length: WINDOW_DAYS }, (_, i) => ({
    filled: i < capped,
    now: i === capped - 1 && x.bucket !== 'act',
  }))
}

export function tickTone(x: Provider): string {
  return x.bucket === 'urg' ? 't-urg' : x.bucket === 'warn' ? 't-warn' : ''
}

// ─────────────────────────────────────────────
// COUNTS + REP STATS
// ─────────────────────────────────────────────
export function counts(list: Provider[], orders: Order[], approvals: Approval[]) {
  return {
    urg: list.filter(x => x.bucket === 'urg').length,
    dead: list.filter(x => x.bucket === 'dead').length,
    norep: list.filter(x => !x.rep && x.orders === 0).length,
    win: list.filter(x => ['urg', 'warn', 'ok'].includes(x.bucket)).length,
    act: list.filter(x => x.orders > 0).length,
    ord: orders.length,
    apr: approvals.length,
  }
}

export function repStats(list: Provider[], repName: string, reps: Rep[] = []): RepStats {
  const mine = list.filter(x => x.rep === repName)
  const match = reps.find(r => r.name === repName)
  return {
    r: repName,
    id: match?.id ?? null,
    mine,
    total: mine.length,
    act: mine.filter(x => x.orders > 0).length,
    urg: mine.filter(x => x.bucket === 'urg').length,
    rev: mine.reduce((a, b) => a + b.rev, 0),
    ord: mine.reduce((a, b) => a + b.orders, 0),
    rate: mine.length
      ? Math.round(mine.filter(x => x.orders > 0).length / mine.length * 100)
      : 0,
  }
}

export function activationRate(list: Provider[]): number {
  if (!list.length) return 0
  return Math.round(list.filter(x => x.orders > 0).length / list.length * 100)
}

/** Revenue billed in the current calendar month. */
export function billedThisMonth(orders: Order[], now = today()): number {
  return orders
    .filter(o => o.date.getMonth() === now.getMonth() && o.date.getFullYear() === now.getFullYear())
    .reduce((a, b) => a + b.total, 0)
}

// ─────────────────────────────────────────────
// SORTING
// ─────────────────────────────────────────────
export type SortKey = 'n' | 'acc' | 'left' | 'last' | 'stage' | 'rep'

export function sortProviders(a: Provider[], key: SortKey, dir: 1 | -1): Provider[] {
  return a.slice().sort((x, y) => {
    let vx: any, vy: any
    if (key === 'n') { vx = x.n.toLowerCase(); vy = y.n.toLowerCase() }
    else if (key === 'acc') { vx = x.acc?.getTime() ?? 0; vy = y.acc?.getTime() ?? 0 }
    // Activated accounts sort to the end of a window sort — they have no
    // countdown left to run.
    else if (key === 'left') { vx = x.orders > 0 ? 999 : x.left; vy = y.orders > 0 ? 999 : y.left }
    else if (key === 'last') { vx = x.last?.getTime() ?? 0; vy = y.last?.getTime() ?? 0 }
    else if (key === 'stage') { vx = STAGE_KEYS.indexOf(x.stage); vy = STAGE_KEYS.indexOf(y.stage) }
    else { vx = x.rep || 'zzz'; vy = y.rep || 'zzz' }
    return vx < vy ? -dir : vx > vy ? dir : 0
  })
}
