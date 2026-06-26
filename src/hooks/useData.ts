// File: src/hooks/useData.ts
// All data-fetching hooks for the dashboard.
// Every page uses these instead of mock data.

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import {
  getClientOrders,
  getMyClients,
  getAllClients,
  getPendingProviders,
  getAllReps,
  placeOrderForClient,
  approveProvider,
  rejectProvider,
  assignClientToRep,
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
// PRODUCTS  (fetched via server route to keep WC credentials off the client)
// ─────────────────────────────────────────────
async function fetchProducts() {
  const res = await fetch('/api/products')
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to load products.')
  }
  return res.json()
}

export function useProducts() {
  return useFetch(fetchProducts, [])
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


// ─────────────────────────────────────────────
// NOTES (stored in WordPress via custom endpoint)
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
  }) => {
    setLoading(true)
    setSuccess(false)
    setError(null)
    try {
      await placeOrderForClient(params)
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
// LEADERBOARD — derived from reps data
// ─────────────────────────────────────────────
export function useLeaderboard() {
  const { data: reps, loading, error } = useReps()

  const leaderboard = reps
    ? [...reps]
        .sort((a, b) => b.ordersMonth - a.ordersMonth)
        .map((rep, index) => ({ ...rep, rank: index + 1 }))
    : null

  return { leaderboard, loading, error }
}


// ─────────────────────────────────────────────
// DASHBOARD STATS — derived from clients + orders
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