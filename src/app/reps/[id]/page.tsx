'use client'
// File: src/app/reps/[id]/page.tsx
//
// Requirement 3 — Sales Representatives Module: a clickable profile page
// for each rep showing their assigned clients, per-client order amount,
// each client's complete order history, and the rep's total sales +
// total revenue.

import { useAuth } from '@/lib/auth-context'
import { useSingleRep, useAllClients, useOrdersByCustomers } from '@/hooks/useData'
import { Topbar } from '@/components/layout/Topbar'
import { Card, MetricCard } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { TableSkeleton, ErrorState } from '@/components/ui/Skeleton'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { use } from 'react'
import Link from 'next/link'

function statusVariant(status: string): 'teal' | 'amber' | 'red' | 'gray' {
  if (['completed', 'processing'].includes(status)) return 'teal'
  if (['pending', 'on-hold'].includes(status)) return 'amber'
  if (['cancelled', 'failed', 'refunded'].includes(status)) return 'red'
  return 'gray'
}

export default function RepDetailPage({ params }: { params: { id: string } | Promise<{ id: string }> }) {
  const router = useRouter()
  const { isRep } = useAuth()
  const resolvedParams = typeof (params as any)?.then === 'function'
    ? use(params as Promise<{ id: string }>)
    : (params as { id: string })
  const repId = parseInt(resolvedParams.id)

  const { data: rep, loading: repLoading, error: repError } = useSingleRep(repId)
  const { data: allClients, loading: clientsLoading } = useAllClients()

  const assignedClients = (allClients || []).filter(
    (c: any) => rep?.rep_code && c.assigned_rep_code === rep.rep_code
  )
  const clientIds = assignedClients.map((c: any) => c.id)

  const { data: orders, loading: ordersLoading, error: ordersError } = useOrdersByCustomers(clientIds)

  // Group orders per client, and compute rep-wide totals.
  const ordersByClient = new Map<number, any[]>()
  ;(orders || []).forEach((o: any) => {
    const list = ordersByClient.get(o.customer_id) || []
    list.push(o)
    ordersByClient.set(o.customer_id, list)
  })

  const totalSales = (orders || []).length
  const totalRevenue = (orders || []).reduce((sum: number, o: any) => sum + (o.total || 0), 0)

  const loading = repLoading || clientsLoading
  const error = repError

  if (isRep) {
    // Reps only ever see their own row on /reps (which they don't even
    // have access to per role config) — guard just in case someone
    // navigates here directly.
    return (
      <>
        <Topbar title="Not available" />
        <div className="p-4 md:p-7"><ErrorState message="This page is only available to sales managers and administrators." /></div>
      </>
    )
  }

  return (
    <>
      <Topbar
        title={loading ? 'Sales Representative' : rep?.name || 'Sales Representative'}
        subtitle={rep?.rep_code ? `Rep code: ${rep.rep_code}` : undefined}
      />
      <div className="p-4 md:p-7 space-y-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={15} /> Back
        </button>

        {loading && <TableSkeleton rows={4} />}
        {error && <ErrorState message={error} />}

        {!loading && !error && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard label="Assigned clients" value={String(assignedClients.length)} />
              <MetricCard label="Total sales" value={String(totalSales)} delta="Orders placed" deltaType="neutral" />
              <MetricCard label="Total revenue" value={`$${totalRevenue.toLocaleString()}`} deltaType="positive" delta="Lifetime, from assigned clients" />
              <MetricCard label="Email" value={rep?.email || '—'} deltaType="neutral" />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Assigned clients</h2>
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {['Client', 'Country', 'Order amount (lifetime)', 'Total orders', 'Last order'].map(h => (
                          <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {assignedClients.length === 0 ? (
                        <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">No clients assigned to this rep yet.</td></tr>
                      ) : assignedClients.map((client: any) => {
                        const clientOrders = ordersByClient.get(client.id) || []
                        const clientTotal = clientOrders.reduce((s: number, o: any) => s + (o.total || 0), 0)
                        return (
                          <tr key={client.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                            <td className="px-4 py-3">
                              <Link href={`/clients/${client.id}`} className="font-medium text-gray-900 hover:text-brand hover:underline">
                                {client.name}
                              </Link>
                              <p className="text-xs text-gray-400">{client.clinic}</p>
                            </td>
                            <td className="px-4 py-3 text-gray-600">{client.country}</td>
                            <td className="px-4 py-3 font-medium">
                              {ordersLoading ? '…' : `$${clientTotal.toLocaleString()}`}
                            </td>
                            <td className="px-4 py-3 text-gray-600">{ordersLoading ? '…' : clientOrders.length}</td>
                            <td className="px-4 py-3 text-gray-500 text-xs">{client.last_order || 'Never'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-gray-900 mb-3">
                Complete order history <span className="text-gray-400 font-normal text-xs">— all clients assigned to this rep</span>
              </h2>
              <Card>
                {ordersError && <div className="p-4"><ErrorState message={ordersError} /></div>}
                {ordersLoading && !ordersError && <TableSkeleton rows={3} />}
                {!ordersLoading && !ordersError && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          {['Order', 'Client', 'Date', 'Products', 'Total', 'Status'].map(h => (
                            <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(orders || []).length === 0 ? (
                          <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">No orders yet from this rep's clients.</td></tr>
                        ) : (orders || [])
                          .slice()
                          .sort((a: any, b: any) => new Date(b.raw_date).getTime() - new Date(a.raw_date).getTime())
                          .map((order: any) => {
                            const client = assignedClients.find((c: any) => c.id === order.customer_id)
                            return (
                              <tr key={order.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                                <td className="px-4 py-3 font-mono text-xs text-gray-500">{order.number}</td>
                                <td className="px-4 py-3 font-medium text-gray-900">{client?.name || `#${order.customer_id}`}</td>
                                <td className="px-4 py-3 text-gray-500 text-xs">{order.date}</td>
                                <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{order.products}</td>
                                <td className="px-4 py-3 font-medium">{order.total_formatted}</td>
                                <td className="px-4 py-3"><Badge variant={statusVariant(order.status)}>{order.status}</Badge></td>
                              </tr>
                            )
                          })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          </>
        )}
      </div>
    </>
  )
}
