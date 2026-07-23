// File: src/hooks/useData.ts
// All data-fetching hooks for the dashboard.

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import {
  getClientOrders,
  getMyClients,
  getAllClients,
  getPendingProviders,
  getAllReps,
  getLeaderboard,
  getSingleRep,
  updateRep,
  placeOrderForClient,
  approveProvider,
  rejectProvider,
  assignClientToRep,
  getMyCommissions,
  approveCommission,
  getMyReferralStats,
  deactivateClient,
  reactivateClient,
  deleteClient,
  deleteRep,
} from '@/lib/woocommerce'
import { getNotes, saveNote } from '@/lib/notes'
import type { Note } from '@/types'

// ─────────────────────────────────────────────
// GENERIC FETCH HOOK
// ─────────────────────────────────────────────
function useFetch<T>(fetcher: () => Promise<T>, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetcher()
      setData(result)
    } catch (err: any) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }, deps)

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, error, refetch: fetch }
}


// ─────────────────────────────────────────────
// CLIENTS
// ─────────────────────────────────────────────
export function useMyClients() {
  const { user } = useAuth()
  return useFetch(
    () => getMyClients(user!.token),
    [user?.token]
  )
}

export function useAllClients() {
  const { user } = useAuth()
  return useFetch(
    () => getAllClients(user!.token),
    [user?.token]
  )
}

export function useClients() {
  const { isRep } = useAuth()
  const my = useMyClients()
  const all = useAllClients()
  return isRep ? my : all
}


// ─────────────────────────────────────────────
// CLIENT ORDERS
// ─────────────────────────────────────────────
export function useClientOrders(clientId: number) {
  return useFetch(
    () => getClientOrders(clientId),
    [clientId]
  )
}


// ─────────────────────────────────────────────
// SINGLE CUSTOMER — name/email/country, used by the DocuSign
// consent buttons on the client detail page.
// ─────────────────────────────────────────────
export function useCustomer(clientId: number) {
  return useFetch(
    async () => {
      const res = await fetch(`/api/customers/${clientId}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Customer API error: ${res.status}`)
      }
      return res.json()
    },
    [clientId]
  )
}


// ─────────────────────────────────────────────
// PRODUCTS
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// CLIENT-SIDE CACHE — prevents multiple components
// from each triggering a separate /api/products call.
// Shared across all hook instances for the lifetime of the page.
// ─────────────────────────────────────────────
let productsCache: any[] | null = null
let productsCacheTime = 0
const PRODUCTS_CACHE_MS = 5 * 60 * 1000 // 5 minutes

export function useProducts() {
  return useFetch(fetchProductsFromAPI, [])
}

async function fetchProductsFromAPI() {
  // Return client-side cache if fresh
  if (productsCache && Date.now() - productsCacheTime < PRODUCTS_CACHE_MS) {
    return productsCache
  }
  const res = await fetch('/api/products')
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Products API error: ${res.status}`)
  }
  const data = await res.json()
  productsCache = data
  productsCacheTime = Date.now()
  return data
}


// ─────────────────────────────────────────────
// INVENTORY — live warehouse stock (Roberto's CellGenic Ops API)
// Never cached client-side: stock data is always-fresh by design, so a
// stale read here risks overselling. No client-side cache layer, unlike
// products above.
// ─────────────────────────────────────────────
export function useInventory() {
  return useFetch(async () => {
    const res = await fetch('/api/inventory', { cache: 'no-store' })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `Inventory API error: ${res.status}`)
    }
    const data = await res.json()
    return data.products || []
  }, [])
}


// ─────────────────────────────────────────────
// PENDING PROVIDERS
// ─────────────────────────────────────────────
export function usePendingProviders() {
  const { user } = useAuth()
  return useFetch(
    () => getPendingProviders(user!.token),
    [user?.token]
  )
}


// ─────────────────────────────────────────────
// REPS
// ─────────────────────────────────────────────
export function useReps() {
  const { user } = useAuth()
  return useFetch(
    () => getAllReps(user!.token),
    [user?.token]
  )
}

// Single rep — used to populate the Edit modal
export function useSingleRep(repId: number | null) {
  const { user } = useAuth()
  return useFetch(
    () => repId ? getSingleRep(user!.token, repId) : Promise.resolve(null),
    [user?.token, repId]
  )
}

// Update rep — used when saving the Edit modal
export function useUpdateRep() {
  const { user } = useAuth()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async (
    repId: number,
    data: { name?: string; email?: string; rep_code?: string; phone?: string },
    onSuccess: () => void
  ) => {
    setSaving(true)
    setError(null)
    try {
      await updateRep(user!.token, repId, data)
      onSuccess()
    } catch (err: any) {
      setError(err.message || 'Failed to update rep.')
    } finally {
      setSaving(false)
    }
  }

  return { save, saving, error }
}


// ─────────────────────────────────────────────
// DOCUSIGN CONSENT STATUS — persisted signed/sent state per client
// ─────────────────────────────────────────────
export function useConsentStatus(clientId: number) {
  return useFetch(
    async () => {
      const res = await fetch(`/api/docusign/status/${clientId}`)
      if (!res.ok) return { research: null, cosmetic: null }
      return res.json()
    },
    [clientId]
  )
}


// ─────────────────────────────────────────────
// NOTES
// ─────────────────────────────────────────────
export function useNotes(clientId: number) {
  const { user } = useAuth()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const data = await getNotes(user!.token, clientId)
        setNotes(data)
      } catch {
        setNotes([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [clientId, user?.token])

  const addNote = async (text: string, type: Note['type']) => {
    const newNote = await saveNote(user!.token, {
      clientId,
      text,
      type,
      author: user!.name,
    })
    setNotes(prev => [newNote, ...prev])
  }

  return { notes, loading, addNote }
}


// ─────────────────────────────────────────────
// PLACE ORDER
// ─────────────────────────────────────────────
export function usePlaceOrder() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const placeOrder = async (params: {
    customerId: number
    productId: number
    variationId?: number
    quantity: number
    shippingMethod: 'standard' | 'overnight'
    repNote?: string
  }) => {
    setLoading(true)
    setSuccess(false)
    setError(null)
    try {
      // Call the internal server-side API route — keeps WC credentials off the browser
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to place order.')
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Failed to place order.')
    } finally {
      setLoading(false)
    }
  }

  return { placeOrder, loading, success, error }
}


// ─────────────────────────────────────────────
// PROVIDER APPROVAL ACTIONS
// ─────────────────────────────────────────────
export function useProviderActions() {
  const { user } = useAuth()
  const [processing, setProcessing] = useState<number | null>(null)

  const approve = async (userId: number, onSuccess: () => void) => {
    setProcessing(userId)
    try {
      await approveProvider(user!.token, userId)
      onSuccess()
    } finally {
      setProcessing(null)
    }
  }

  const reject = async (userId: number, onSuccess: () => void) => {
    setProcessing(userId)
    try {
      await rejectProvider(user!.token, userId)
      onSuccess()
    } finally {
      setProcessing(null)
    }
  }

  return { approve, reject, processing }
}


// ─────────────────────────────────────────────
// ASSIGN CLIENT TO REP
// ─────────────────────────────────────────────
export function useAssignClient() {
  const { user } = useAuth()
  const [processing, setProcessing] = useState(false)

  const assign = async (userId: number, repCode: string, onSuccess: () => void) => {
    setProcessing(true)
    try {
      await assignClientToRep(user!.token, userId, repCode)
      onSuccess()
    } finally {
      setProcessing(false)
    }
  }

  return { assign, processing }
}


// ─────────────────────────────────────────────
// CLIENT ACCESS — deactivate / reactivate (admin)
// Used on the All Clients and Unassigned tables. Works the same way
// regardless of whether the client currently has a rep assigned.
// ─────────────────────────────────────────────
export function useClientAccess() {
  const { user } = useAuth()
  const [processing, setProcessing] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const deactivate = async (userId: number, onSuccess: () => void) => {
    setProcessing(userId)
    setError(null)
    try {
      await deactivateClient(user!.token, userId)
      onSuccess()
    } catch (err: any) {
      setError(err.message || 'Failed to deactivate client.')
    } finally {
      setProcessing(null)
    }
  }

  const reactivate = async (userId: number, onSuccess: () => void) => {
    setProcessing(userId)
    setError(null)
    try {
      await reactivateClient(user!.token, userId)
      onSuccess()
    } catch (err: any) {
      setError(err.message || 'Failed to reactivate client.')
    } finally {
      setProcessing(null)
    }
  }

  // PERMANENT delete — removes the account and all its order history.
  // Cannot be undone; the backend restricts this to administrators only.
  const remove = async (userId: number, onSuccess: () => void) => {
    setProcessing(userId)
    setError(null)
    try {
      await deleteClient(user!.token, userId)
      onSuccess()
    } catch (err: any) {
      setError(err.message || 'Failed to delete client.')
    } finally {
      setProcessing(null)
    }
  }

  return { deactivate, reactivate, remove, processing, error }
}


// ─────────────────────────────────────────────
// REP ACCESS — permanent delete (admin only)
// Their clients are unassigned (not deleted) so they surface on the
// Unassigned tab — see /api/delete-rep on the WordPress side.
// ─────────────────────────────────────────────
export function useRepAccess() {
  const { user } = useAuth()
  const [processing, setProcessing] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const remove = async (repId: number, onSuccess: () => void) => {
    setProcessing(repId)
    setError(null)
    try {
      await deleteRep(user!.token, repId)
      onSuccess()
    } catch (err: any) {
      setError(err.message || 'Failed to delete rep.')
    } finally {
      setProcessing(null)
    }
  }

  return { remove, processing, error }
}


// ─────────────────────────────────────────────
// ALL ORDERS — platform-wide order list (Orders page)
// Requires the list of known client/customer IDs — see the comment in
// /api/orders/all/route.ts for why this can't be an unfiltered call.
// ─────────────────────────────────────────────
export function useAllOrders(customerIds: number[], unrestricted: boolean = false) {
  const key = customerIds.slice().sort((a, b) => a - b).join(',')
  return useFetch(async () => {
    // Admins get mode=all — a true, unfiltered "every order on the
    // platform" listing, with the server falling back to the known-client
    // approach automatically if the WC key doesn't permit that. Reps and
    // managers just use the known-client approach directly.
    if (!unrestricted && !customerIds.length) return { orders: [], usedFallback: false }

    const params = new URLSearchParams()
    if (unrestricted) params.set('mode', 'all')
    if (key) params.set('customers', key)

    const res = await fetch(`/api/orders/all?${params.toString()}`)
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `Orders API error: ${res.status}`)
    }
    return res.json()
  }, [key, unrestricted])
}

// ─────────────────────────────────────────────
// ORDERS FOR A SET OF CUSTOMERS — used on the Rep detail page to build
// each assigned client's order amount + complete order history.
// ─────────────────────────────────────────────
export function useOrdersByCustomers(customerIds: number[]) {
  const key = customerIds.slice().sort((a, b) => a - b).join(',')
  return useFetch(async () => {
    if (!customerIds.length) return []
    const res = await fetch(`/api/orders/by-customers?customers=${key}`)
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `Orders API error: ${res.status}`)
    }
    return res.json()
  }, [key])
}


// ─────────────────────────────────────────────
// LEADERBOARD — derived from reps data
// ─────────────────────────────────────────────
export function useLeaderboard() {
  const { user } = useAuth()
  // Uses dedicated /leaderboard endpoint — accessible by ALL roles (rep, manager, admin)
  // Does NOT call /reps which is manager/admin only and would 403 for sales reps
  const { data, loading, error } = useFetch(
    () => getLeaderboard(user!.token),
    [user?.token]
  )
  return { leaderboard: data, loading, error }
}


// ─────────────────────────────────────────────
// DASHBOARD STATS
// ─────────────────────────────────────────────
export function useDashboardStats() {
  const { data: clients, loading } = useClients()

  const stats = clients ? {
    totalClients: clients.length,
    atRiskClients: clients.filter((c: any) => c.at_risk).length,
    ordersThisMonth: clients.reduce((sum: number, c: any) => sum + (c.orders_this_month || 0), 0),
  } : null

  return { stats, loading }
}


// ─────────────────────────────────────────────
// MY COMMISSIONS (rep)
// ─────────────────────────────────────────────
export function useMyCommissions() {
  const { user } = useAuth()
  return useFetch(
    () => getMyCommissions(user!.token),
    [user?.token]
  )
}


// ─────────────────────────────────────────────
// APPROVE COMMISSION (manager/admin)
// ─────────────────────────────────────────────
export function useApproveCommission() {
  const { user } = useAuth()
  const [processing, setProcessing] = useState<number | null>(null)

  const approve = async (repId: number, onSuccess: () => void) => {
    setProcessing(repId)
    try {
      await approveCommission(user!.token, repId)
      onSuccess()
    } finally {
      setProcessing(null)
    }
  }

  return { approve, processing }
}


// ─────────────────────────────────────────────
// MY REFERRAL STATS (rep)
// ─────────────────────────────────────────────
export function useMyReferralStats() {
  const { user } = useAuth()
  return useFetch(
    () => getMyReferralStats(user!.token),
    [user?.token]
  )
}
