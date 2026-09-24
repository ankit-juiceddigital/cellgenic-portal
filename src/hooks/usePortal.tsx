'use client'
// File: src/hooks/usePortal.tsx
//
// One provider holds the whole dataset, because the design cross-links
// everything: a rep drawer lists that rep's providers, a provider drawer
// lists that provider's orders, an order drawer links back to the
// provider. Fetching per-page would mean the same data three times and
// three different loading states inside one drawer.
//
// Mutations update local state immediately and reconcile with the server
// response, so pressing "Send quote" moves the pill without a refetch —
// which is how the prototype behaved.

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from 'react'
import { useAuth } from '@/lib/auth-context'
import * as api from '@/lib/api'
import {
  countryName, enrich, parseDate, PER_PAGE, STAGE,
} from '@/lib/portal-model'
import type {
  Approval, Order, Provider, Rep, Stage,
} from '@/types/portal'

// ─────────────────────────────────────────────
// MAPPERS — API response → design model
// ─────────────────────────────────────────────
function mapProvider(r: any): Provider {
  const cc = (r.country_code || '').toUpperCase()
  return {
    id: r.id,
    i: 0, // set by enrich()
    n: r.name || '—',
    e: r.email || '',
    p: r.phone || '',
    c: r.country || countryName(cc, '—'),
    cc,
    clinic: r.clinic || null,
    rep: r.assigned_rep || null,
    repCode: r.assigned_rep_code || null,
    acc: parseDate(r.access_granted_at),
    last: parseDate(r.last_order),
    orders: Number(r.total_orders || 0),
    rev: Number(r.lifetime_revenue || 0),
    stage: (r.stage || 'new') as Stage,
    vip: Boolean(r.vip),
    tag: r.tag || null,
    accountStatus: String(r.account_status || 'approved').toLowerCase(),
    extendedDays: Number(r.window_extra_days || 0),
    // filled by enrich()
    elapsed: 0, left: 0, closes: null, bucket: 'ok',
  }
}

function mapOrder(r: any): Order {
  return {
    id: r.id,
    number: r.number,
    customerId: r.customer_id,
    customerName: r.customer_name || '—',
    date: parseDate(r.raw_date) || new Date(),
    status: r.status,
    total: Number(r.total || 0),
    items: (r.lineItems || []).map((l: any) => ({
      name: l.name,
      sku: l.sku ?? null,
      quantity: Number(l.quantity || 0),
      unitPrice: Number(l.unitPrice || 0),
      lineTotal: Number(l.lineTotal || 0),
    })),
    itemCount: Number(r.itemCount || 0),
    subtotal: Number(r.subtotal || 0),
    shippingMethod: r.shippingMethod ?? null,
    shippingCost: Number(r.shippingCost || 0),
    placedBy: r.placed_by ?? null,
    paymentMethod: r.payment_method ?? null,
    billingCountry: r.billing_country ?? null,
  }
}

/**
 * The design's approval card shows a one-line review note and a
 * documents summary. The API has neither as a field, so both are derived
 * from what it does return. This is display-layer inference and is kept
 * here rather than pretending the backend supplies it.
 */
function mapApproval(r: any): Approval {
  const setup = r.setup || ''
  const institutional = /hospital|institution|research/i.test(setup)

  const note = !r.has_document
    ? 'Missing verification document'
    : institutional
      ? `Institutional · ${setup}`
      : r.role
        ? `${r.role}${r.years ? ` · ${r.years} yrs` : ''}`
        : 'Awaiting review'

  return {
    id: r.id,
    n: r.name || '—',
    e: r.email || '',
    p: r.phone || '',
    c: r.country || '—',
    cc: '', // /pending-providers returns a country NAME, not a code — see plan
    state: r.state || null,
    city: r.city || null,
    req: parseDate(r.submitted) || new Date(),
    note,
    doc: r.has_document ? 'Verification document on file' : 'No documents uploaded',
    docUrl: r.verification_doc || null,
    hasDocument: Boolean(r.has_document),
    referralCode: r.referal_linkcode || null,
    providerRole: r.role || null,
    years: r.years || null,
    volume: r.volume || null,
    setup: setup || null,
    pillars: r.pillars || null,
    investment: r.investment || null,
    message: r.message || null,
    source: r.source === 'colombia_webinar' ? 'colombia_webinar' : 'become_provider',
    applicationReference: r.reference || null,
    consentAt: r.consent_at || null,
    offerCode: r.offer_code || null,
    offerPercent: r.offer_percent ? Number(r.offer_percent) : null,
    offerHeldAt: r.offer_held_at || null,
    offerDeadline: r.offer_deadline || null,
    offerWithinWindow: Boolean(r.offer_within_window),
  }
}

function mapRep(r: any): Rep {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    repCode: r.rep_code ?? null,
    role: r.role,
    isAlsoRep: Boolean(r.is_also_rep),
    clients: Number(r.clients || 0),
    ordersMonth: Number(r.ordersMonth || 0),
    revenue: r.revenue || '$0',
    commission: r.commission || '$0',
    trend: r.trend || '0%',
  }
}

// ─────────────────────────────────────────────
// CONTEXT
// ─────────────────────────────────────────────
interface PortalValue {
  providers: Provider[]
  orders: Order[]
  approvals: Approval[]
  reps: Rep[]
  repNames: string[]
  loading: boolean
  error: string | null
  ordersLoading: boolean
  ordersError: string | null
  ordersLoaded: boolean
  dashboardBilledThisMonth: number | null
  dashboardSummaryLoading: boolean
  approvalsLoading: boolean
  repsLoading: boolean
  revealed: Set<number>
  revealCount: number
  refetch: (opts?: { silent?: boolean }) => void

  byId: (id: number) => Provider | undefined
  ordersFor: (providerId: number) => Order[]
  loadOrders: (force?: boolean) => Promise<void>
  loadOrdersFor: (providerId: number, force?: boolean) => Promise<void>
  isOrdersLoadingFor: (providerId: number) => boolean
  isOrdersLoadedFor: (providerId: number) => boolean

  reveal: (providerId: number) => Promise<void>
  advanceStage: (providerId: number) => Promise<void>
  setStage: (providerId: number, stage: Stage) => Promise<void>
  extend: (providerIds: number[], days: number) => Promise<{ changed: number; skipped: number }>
  assignRep: (providerIds: number[], repCode: string, repName: string | null) => Promise<void>
  approve: (approvalId: number) => Promise<void>
  reject: (approvalId: number) => Promise<void>
  deactivateAccount: (providerId: number) => Promise<void>
  reactivateAccount: (providerId: number) => Promise<void>
  busy: number | null
}

const PortalContext = createContext<PortalValue | null>(null)

export function PortalProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const token = user?.token
  const isAdmin = user?.role === 'administrator'

  const [providers, setProviders] = useState<Provider[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [reps, setReps] = useState<Rep[]>([])
  const [revealed, setRevealed] = useState<Set<number>>(new Set())
  const [revealCount, setRevealCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [ordersError, setOrdersError] = useState<string | null>(null)
  const [ordersLoaded, setOrdersLoaded] = useState(false)
  const [clientOrdersLoading, setClientOrdersLoading] = useState<Set<number>>(new Set())
  const [clientOrdersLoaded, setClientOrdersLoaded] = useState<Set<number>>(new Set())
  const [dashboardBilledThisMonth, setDashboardBilledThisMonth] = useState<number | null>(null)
  const [dashboardSummaryLoading, setDashboardSummaryLoading] = useState(false)
  const [approvalsLoading, setApprovalsLoading] = useState(true)
  const [repsLoading, setRepsLoading] = useState(true)
  const [busy, setBusy] = useState<number | null>(null)
  const [tick, setTick] = useState(0)
  // Read by the load effect on the next run, then reset. A ref rather
  // than state so setting it can't trigger a render of its own.
  const silentRef = useRef(false)

  const refetch = useCallback((opts?: { silent?: boolean }) => {
    silentRef.current = Boolean(opts?.silent)
    setTick(t => t + 1)
  }, [])

  useEffect(() => {
    if (!token) return
    let cancelled = false

    // A silent run keeps whatever is on screen while it refreshes.
    const silent = silentRef.current
    silentRef.current = false

    async function load() {
      if (!silent) setLoading(true)
      setError(null)
      try {
        // The only request that blocks the first usable render is the
        // lightweight portal-client list. Full WooCommerce order history
        // is intentionally NOT fetched here; that was the main source of
        // slow first-paint times because admins could download thousands
        // of complete orders before the Overview was allowed to render.
        const clientsRes = await api.getPortalClients(token!)
        if (cancelled) return
        const mapped = enrich(clientsRes.clients.map(mapProvider))
        setProviders(mapped)

        // The portal can render now. Everything below is secondary and
        // must never keep the main dashboard behind a loading screen.
        if (!silent) setLoading(false)

        setDashboardSummaryLoading(true)
        setApprovalsLoading(true)
        setRepsLoading(true)
        const [approvalsRes, repsRes, revealRes, summaryRes] = await Promise.allSettled([
          api.getPendingProviders(token!),
          isAdmin || user?.role === 'sales_manager' ? api.getReps(token!) : Promise.resolve([]),
          api.getRevealCount(token!),
          api.getDashboardSummary(token!, mapped.map(p => p.id), Boolean(isAdmin)),
        ])
        if (cancelled) return

        if (approvalsRes.status === 'fulfilled') {
          setApprovals((approvalsRes.value || []).map(mapApproval))
        }
        setApprovalsLoading(false)
        if (repsRes.status === 'fulfilled') {
          setReps(((repsRes.value as any[]) || []).map(mapRep))
        }
        setRepsLoading(false)
        if (revealRes.status === 'fulfilled') {
          setRevealCount(revealRes.value.today || 0)
        }
        if (summaryRes.status === 'fulfilled') {
          setDashboardBilledThisMonth(Number(summaryRes.value.billed_this_month || 0))
        }
        setDashboardSummaryLoading(false)
      } catch (err: any) {
        // A failed background refresh must not replace a working screen
        // with an error panel — keep showing the last good data.
        if (!cancelled && !silent) setError(err.message || 'Could not load the portal data.')
      } finally {
        if (!cancelled) {
          if (!silent) setLoading(false)
          setDashboardSummaryLoading(false)
          // If a secondary request threw before its settled result was handled,
          // do not leave a section showing a permanent spinner.
          setApprovalsLoading(false)
          setRepsLoading(false)
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [token, isAdmin, user?.role, tick])

  // ── keeping it fresh without flicker ──
  // Two triggers, both silent: coming back to the tab, and a slow poll
  // for a tab left open all day. 3 minutes is a deliberate compromise —
  // the 30-day window moves in days, not seconds, so anything faster is
  // just load on WordPress.
  useEffect(() => {
    if (!token) return

    const onFocus = () => refetch({ silent: true })
    const onVisible = () => {
      if (document.visibilityState === 'visible') refetch({ silent: true })
    }

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)
    const timer = setInterval(() => {
      // Don't poll a hidden tab — the focus handler covers the return.
      if (document.visibilityState === 'visible') refetch({ silent: true })
    }, 3 * 60 * 1000)

    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(timer)
    }
  }, [token, refetch])

  // ── lazy WooCommerce order loading ──
  // Full order history is intentionally opt-in. Overview/Clients/Activation
  // render from the cached WordPress client totals and do not pay the cost
  // of downloading line items, billing data and metadata they never display.
  const loadOrders = useCallback(async (force = false) => {
    if (!token || ordersLoading) return
    if (ordersLoaded && !force) return

    setOrdersLoading(true)
    setOrdersError(null)
    try {
      const ids = providers.map(p => p.id)
      const res = await api.getAllOrders(token, ids, Boolean(isAdmin))
      setOrders((res.orders || []).map(mapOrder))
      setOrdersLoaded(true)
      // A full history supersedes any per-client partial caches.
      setClientOrdersLoaded(new Set(ids))
    } catch (err: any) {
      setOrdersError(err.message || 'Could not load orders.')
      throw err
    } finally {
      setOrdersLoading(false)
    }
  }, [token, providers, isAdmin, ordersLoading, ordersLoaded])

  const loadOrdersFor = useCallback(async (providerId: number, force = false) => {
    if (!token || !providerId) return
    if (ordersLoaded && !force) return
    if (clientOrdersLoading.has(providerId)) return
    if (clientOrdersLoaded.has(providerId) && !force) return

    setClientOrdersLoading(prev => new Set(prev).add(providerId))
    try {
      const res = await api.getClientOrders(token, providerId)
      const mapped = (res || []).map((r: any) => mapOrder({ ...r, customer_id: r.customer_id ?? providerId }))
      setOrders(prev => {
        const withoutClient = prev.filter(o => o.customerId !== providerId)
        return [...withoutClient, ...mapped]
      })
      setClientOrdersLoaded(prev => new Set(prev).add(providerId))
    } finally {
      setClientOrdersLoading(prev => {
        const next = new Set(prev)
        next.delete(providerId)
        return next
      })
    }
  }, [token, ordersLoaded, clientOrdersLoading, clientOrdersLoaded])

  const isOrdersLoadingFor = useCallback(
    (providerId: number) => ordersLoading || clientOrdersLoading.has(providerId),
    [ordersLoading, clientOrdersLoading],
  )

  const isOrdersLoadedFor = useCallback(
    (providerId: number) => ordersLoaded || clientOrdersLoaded.has(providerId),
    [ordersLoaded, clientOrdersLoaded],
  )

  // ── derived ──
  const repNames = useMemo(() => {
    // Reps who can actually own accounts: anyone with a rep code. Falls
    // back to the names already attached to providers when /reps 403s
    // for a plain rep.
    const fromReps = reps.filter(r => r.repCode).map(r => r.name)
    if (fromReps.length) return Array.from(new Set(fromReps)).sort()
    return Array.from(new Set(providers.map(p => p.rep).filter(Boolean) as string[])).sort()
  }, [reps, providers])

  const byId = useCallback(
    (id: number) => providers.find(p => p.id === id),
    [providers],
  )

  const ordersFor = useCallback(
    (providerId: number) => orders
      .filter(o => o.customerId === providerId)
      .sort((a, b) => b.date.getTime() - a.date.getTime()),
    [orders],
  )

  // ── mutations ──
  const applyLocal = useCallback((id: number, patch: Partial<Provider>) => {
    setProviders(prev => enrich(prev.map(p => (p.id === id ? { ...p, ...patch } : p))))
  }, [])

  const reveal = useCallback(async (providerId: number) => {
    // Shown immediately; the log write is what must not be skipped, so a
    // failure surfaces rather than silently un-revealing the row.
    setRevealed(prev => new Set(prev).add(providerId))
    if (!token) return
    const res = await api.logReveal(token, providerId, 'both')
    setRevealCount(res.today)
  }, [token])

  const setStageFn = useCallback(async (providerId: number, stage: Stage) => {
    if (!token) return
    setBusy(providerId)
    const previous = byId(providerId)?.stage
    applyLocal(providerId, { stage })
    try {
      await api.setStage(token, providerId, stage)
      // A reactivation restarts the window server-side, so that one
      // needs the authoritative dates back.
      if (stage === 'new' && previous === 'dead') refetch()
    } catch (err) {
      if (previous) applyLocal(providerId, { stage: previous })
      throw err
    } finally {
      setBusy(null)
    }
  }, [token, byId, applyLocal, refetch])

  const advanceStage = useCallback(async (providerId: number) => {
    const p = byId(providerId)
    if (!p) return
    await setStageFn(providerId, STAGE[p.stage].next)
  }, [byId, setStageFn])

  /**
   * Adjusts the window extension. `days` may be negative to take an
   * extension back. The server floors the total at zero and returns the
   * authoritative figure, so local state is set from the RESPONSE rather
   * than from an optimistic guess — otherwise removing 15 days from an
   * account that only has 10 would leave the UI showing -5.
   */
  const extend = useCallback(async (providerIds: number[], days: number) => {
    if (!token) return { changed: 0, skipped: 0 }
    let changed = 0
    let skipped = 0
    for (const id of providerIds) {
      const res = await api.extendWindow(token, id, days)
      applyLocal(id, { extendedDays: res.extra_days })
      if (res.applied === 0) skipped++
      else changed++
    }
    return { changed, skipped }
  }, [token, applyLocal])

  const assignRep = useCallback(async (
    providerIds: number[], repCode: string, repName: string | null,
  ) => {
    if (!token) return
    setProviders(prev => enrich(prev.map(p =>
      providerIds.includes(p.id) ? { ...p, repCode: repCode || null, rep: repName } : p,
    )))
    await api.bulkAssign(token, providerIds, repCode)
  }, [token])

  const approve = useCallback(async (approvalId: number) => {
    if (!token) return
    setBusy(approvalId)
    try {
      await api.approveProvider(token, approvalId)
      setApprovals(prev => prev.filter(a => a.id !== approvalId))
      // The approved account now exists as a provider with today as day
      // 0 — that has to come from the server, not be guessed here.
      refetch()
    } finally {
      setBusy(null)
    }
  }, [token, refetch])

  const reject = useCallback(async (approvalId: number) => {
    if (!token) return
    setBusy(approvalId)
    try {
      await api.rejectProvider(token, approvalId)
      setApprovals(prev => prev.filter(a => a.id !== approvalId))
    } finally {
      setBusy(null)
    }
  }, [token])

  /**
   * Blocks portal login — distinct from the 30-day window/stage. A
   * deactivated account keeps its stage, orders and window dates as
   * they were; this only flips `accountStatus`, which the backend
   * uses to refuse login. Optimistic, with rollback on failure since
   * this is a sensitive, access-control action.
   */
  const deactivateAccount = useCallback(async (providerId: number) => {
    if (!token) return
    setBusy(providerId)
    applyLocal(providerId, { accountStatus: 'deactivated' })
    try {
      await api.deactivateClient(token, providerId)
    } catch (err) {
      applyLocal(providerId, { accountStatus: 'approved' })
      throw err
    } finally {
      setBusy(null)
    }
  }, [token, applyLocal])

  const reactivateAccount = useCallback(async (providerId: number) => {
    if (!token) return
    setBusy(providerId)
    applyLocal(providerId, { accountStatus: 'approved' })
    try {
      await api.reactivateClient(token, providerId)
    } catch (err) {
      applyLocal(providerId, { accountStatus: 'deactivated' })
      throw err
    } finally {
      setBusy(null)
    }
  }, [token, applyLocal])

  const value = useMemo<PortalValue>(() => ({
    providers, orders, approvals, reps, repNames,
    loading, error, ordersLoading, ordersError, ordersLoaded,
    dashboardBilledThisMonth, dashboardSummaryLoading, approvalsLoading, repsLoading,
    revealed, revealCount, refetch,
    byId, ordersFor, loadOrders, loadOrdersFor, isOrdersLoadingFor, isOrdersLoadedFor,
    reveal, advanceStage, setStage: setStageFn, extend, assignRep, approve, reject,
    deactivateAccount, reactivateAccount, busy,
  }), [
    providers, orders, approvals, reps, repNames, loading, error, ordersLoading, ordersError, ordersLoaded,
    dashboardBilledThisMonth, dashboardSummaryLoading, approvalsLoading, repsLoading, revealed, revealCount,
    refetch, byId, ordersFor, loadOrders, loadOrdersFor, isOrdersLoadingFor, isOrdersLoadedFor,
    reveal, advanceStage, setStageFn, extend, assignRep, approve, reject,
    deactivateAccount, reactivateAccount, busy,
  ])

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>
}

export function usePortal() {
  const ctx = useContext(PortalContext)
  if (!ctx) throw new Error('usePortal must be used within PortalProvider')
  return ctx
}

export { PER_PAGE }
