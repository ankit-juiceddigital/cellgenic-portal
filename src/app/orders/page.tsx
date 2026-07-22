'use client'
// File: src/app/orders/page.tsx
//
// Centralized order management. Scope depends on role, same pattern as
// /clients: reps see orders from their own assigned clients only; sales
// managers and administrators see every order on the platform.

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useAllOrders, useClients } from '@/hooks/useData'
import { Topbar } from '@/components/layout/Topbar'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { TableSkeleton, ErrorState } from '@/components/ui/Skeleton'
import { Search } from 'lucide-react'
import Link from 'next/link'

function statusVariant(status: string): 'teal' | 'amber' | 'red' | 'gray' | 'blue' {
  if (['completed', 'processing'].includes(status)) return 'teal'
  if (['pending', 'on-hold'].includes(status)) return 'amber'
  if (['cancelled', 'failed', 'refunded'].includes(status)) return 'red'
  return 'gray'
}

export default function OrdersPage() {
  const { isRep, isAdmin } = useAuth()
  // useClients() already returns rep-scoped clients for a rep, or the full
  // list for managers/admins — same hook /clients uses. Still needed even
  // in unrestricted mode, both as the fallback source and to map
  // customer_id -> client name/clinic/rep for display.
  const { data: clients, loading: clientsLoading } = useClients()
  const clientIds = (clients || []).map((c: any) => c.id)
  const { data: ordersResponse, loading: ordersLoading, error, refetch } = useAllOrders(clientIds, isAdmin)
  const orders = ordersResponse?.orders || []
  const usedFallback = ordersResponse?.usedFallback ?? false
  const loading = clientsLoading || ordersLoading
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Map customer_id -> client record so we can show clinic + assigned rep
  // alongside each order without a second round trip per row.
  const clientMap = new Map<number, any>((clients || []).map((c: any) => [c.id, c]))

  const filtered = (orders || []).filter((o: any) => {
    const client = clientMap.get(o.customer_id)
    const matchesQuery =
      !query ||
      o.customer_name?.toLowerCase().includes(query.toLowerCase()) ||
      o.number?.toLowerCase().includes(query.toLowerCase()) ||
      o.products?.toLowerCase().includes(query.toLowerCase()) ||
      client?.clinic?.toLowerCase().includes(query.toLowerCase())
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter
    return matchesQuery && matchesStatus
  })

  const totalRevenue = filtered.reduce((sum: number, o: any) => sum + (o.total || 0), 0)
  const statuses = Array.from(new Set((orders || []).map((o: any) => o.status))) as string[]

  return (
    <>
      <Topbar
        title={isRep ? 'My Orders' : 'Orders'}
        subtitle={isRep ? 'Every order placed by your clients' : 'All orders across the platform — centralized order management'}
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search orders..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-brand w-48"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-brand"
            >
              <option value="all">All statuses</option>
              {statuses.map((s: string) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        }
      />
      <div className="p-4 md:p-7 space-y-4">
        {!loading && !error && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1.5">Orders shown</p>
              <p className="text-2xl font-semibold text-gray-900">{filtered.length}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1.5">Total value</p>
              <p className="text-2xl font-semibold text-gray-900">${totalRevenue.toLocaleString()}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 hidden md:block">
              <p className="text-xs text-gray-500 mb-1.5">All-time orders loaded</p>
              <p className="text-2xl font-semibold text-gray-900">{orders?.length || 0}</p>
            </div>
          </div>
        )}

        {!loading && !error && isAdmin && usedFallback && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
            Showing orders from known provider accounts only — the WooCommerce API key doesn't currently have
            permission to list every order on the store unfiltered, so guest checkouts or orders on non-provider
            accounts won't appear here. Ask Roberto to check the key's permissions if you need those too.
          </div>
        )}

        {loading && <TableSkeleton />}
        {error && <ErrorState message={error} onRetry={refetch} />}
        {!loading && !error && (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {(isRep
                      ? ['Order', 'Client', 'Products', 'Date', 'Total', 'Status']
                      : ['Order', 'Client', 'Assigned rep', 'Products', 'Date', 'Total', 'Status']
                    ).map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={isRep ? 6 : 7} className="px-4 py-8 text-center text-sm text-gray-400">
                        No orders match your search.
                      </td>
                    </tr>
                  ) : filtered.map((order: any) => {
                    const client = clientMap.get(order.customer_id)
                    return (
                      <tr key={order.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{order.number}</td>
                        <td className="px-4 py-3">
                          {client ? (
                            <Link href={`/clients/${client.id}`} className="font-medium text-gray-900 hover:text-brand hover:underline">
                              {client.name}
                            </Link>
                          ) : (
                            <span className="font-medium text-gray-900">{order.customer_name}</span>
                          )}
                          {client?.clinic && <p className="text-xs text-gray-400">{client.clinic}</p>}
                        </td>
                        {!isRep && <td className="px-4 py-3 text-gray-600">{client?.assigned_rep || '—'}</td>}
                        <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{order.products}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{order.date}</td>
                        <td className="px-4 py-3 font-medium">{order.total_formatted}</td>
                        <td className="px-4 py-3"><Badge variant={statusVariant(order.status)}>{order.status}</Badge></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </>
  )
}
