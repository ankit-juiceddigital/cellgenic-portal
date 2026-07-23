'use client'
// File: src/app/orders/page.tsx
//
// Centralized order management. Scope depends on role, same pattern as
// /clients: reps see orders from their own assigned clients only; sales
// managers and administrators see every order on the platform.
//
// Layout follows the CellGenic Ops "Sales orders" screen: status tabs
// with live counts, Location/Sales Rep/Payment columns, sales-rep and
// location filters, Export, and a "New sales order" shortcut into the
// order-placement flow.

import { useState, useMemo, Fragment } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useAllOrders, useClients } from '@/hooks/useData'
import { Topbar } from '@/components/layout/Topbar'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { TableSkeleton, ErrorState } from '@/components/ui/Skeleton'
import { Search, Download, Plus, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'

// Terminal statuses — everything else counts as "Active".
const TERMINAL_STATUSES = ['completed', 'cancelled', 'refunded', 'failed']

// Friendly labels for known statuses. Anything not listed here (including
// any custom order statuses registered on the WooCommerce side) falls
// back to a title-cased version of the raw slug, so this never silently
// hides a status the store actually uses.
const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending Payment',
  processing: 'Processing',
  'on-hold': 'On Hold',
  completed: 'Completed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
  failed: 'Failed',
  draft: 'Draft',
  'checkout-draft': 'Draft',
}

function statusLabel(status: string): string {
  if (STATUS_LABELS[status]) return STATUS_LABELS[status]
  return status
    .replace(/^wc-/, '')
    .split(/[-_]/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function statusVariant(status: string): 'teal' | 'amber' | 'red' | 'gray' | 'blue' {
  if (status === 'completed') return 'teal'
  if (['processing'].includes(status)) return 'blue'
  if (['pending', 'on-hold'].includes(status)) return 'amber'
  if (['cancelled', 'failed', 'refunded'].includes(status)) return 'red'
  return 'gray'
}

function exportToCsv(rows: any[], clientMap: Map<number, any>) {
  const header = ['Invoice', 'Customer', 'Location', 'Order Date', 'Total', 'Status', 'Sales Rep', 'Payment']
  const lines = rows.map(o => {
    const client = clientMap.get(o.customer_id)
    const salesRep = o.placed_by || client?.assigned_rep || ''
    const location = client?.country || o.billing_country || ''
    return [
      o.number,
      client?.name || o.customer_name,
      location,
      o.date,
      o.total_formatted,
      statusLabel(o.status),
      salesRep,
      o.payment_method || '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
  })
  const csv = [header.join(','), ...lines].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
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
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({})
  const [activeTab, setActiveTab] = useState<string>('active')
  const [repFilter, setRepFilter] = useState('all')
  const [locationFilter, setLocationFilter] = useState('all')

  const clientMap = new Map<number, any>((clients || []).map((c: any) => [c.id, c]))

  // Attach the display-only fields once so filtering/rendering both use
  // the same derived values.
  const enriched = useMemo(() => (orders || []).map((o: any) => {
    const client = clientMap.get(o.customer_id)
    return {
      ...o,
      _client: client,
      _salesRep: o.placed_by || client?.assigned_rep || null,
      _location: client?.country || o.billing_country || null,
    }
  }), [orders, clients])

  // Status tabs, built dynamically from whatever statuses actually exist
  // in the data (plus the two fixed buckets), each with a live count.
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    enriched.forEach((o: any) => { counts[o.status] = (counts[o.status] || 0) + 1 })
    return counts
  }, [enriched])
  const activeCount = enriched.filter((o: any) => !TERMINAL_STATUSES.includes(o.status)).length
  const distinctStatuses = Object.keys(statusCounts).sort()

  const salesReps = Array.from(new Set(enriched.map((o: any) => o._salesRep).filter(Boolean))) as string[]
  const locations = Array.from(new Set(enriched.map((o: any) => o._location).filter(Boolean))) as string[]

  const filtered = enriched.filter((o: any) => {
    const matchesQuery =
      !query ||
      o.customer_name?.toLowerCase().includes(query.toLowerCase()) ||
      o.number?.toLowerCase().includes(query.toLowerCase()) ||
      o._client?.name?.toLowerCase().includes(query.toLowerCase()) ||
      o.products?.toLowerCase().includes(query.toLowerCase())
    const matchesTab =
      activeTab === 'all' ? true :
      activeTab === 'active' ? !TERMINAL_STATUSES.includes(o.status) :
      o.status === activeTab
    const matchesRep = repFilter === 'all' || o._salesRep === repFilter
    const matchesLocation = locationFilter === 'all' || o._location === locationFilter
    return matchesQuery && matchesTab && matchesRep && matchesLocation
  })

  const totalRevenue = filtered.reduce((sum: number, o: any) => sum + (o.total || 0), 0)

  const tabs = [
    { key: 'active', label: 'Active', count: activeCount },
    { key: 'all', label: 'All orders', count: enriched.length },
    ...distinctStatuses.map(s => ({ key: s, label: statusLabel(s), count: statusCounts[s] })),
  ]

  return (
    <>
      <Topbar
        title={isRep ? 'My Orders' : 'Orders'}
        subtitle={isRep ? 'Every order placed by your clients' : 'All orders across the platform — centralized order management'}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => exportToCsv(filtered, clientMap)}>
              <Download size={13} /> Export
            </Button>
            <Link href="/order">
              <Button variant="primary" size="sm"><Plus size={13} /> New sales order</Button>
            </Link>
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

        {/* Status tabs */}
        {!loading && !error && (
          <div className="flex items-center gap-1 border-b border-gray-100 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-brand text-gray-900 font-medium'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                {tab.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? 'bg-brand/10 text-brand' : 'bg-gray-100 text-gray-400'}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Search + filters */}
        {!loading && !error && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by order number, customer, invoice..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-brand"
              />
            </div>
            {!isRep && (
              <select
                value={repFilter}
                onChange={e => setRepFilter(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-brand"
              >
                <option value="all">All sales reps</option>
                {salesReps.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            )}
            <select
              value={locationFilter}
              onChange={e => setLocationFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-brand"
            >
              <option value="all">All locations</option>
              {locations.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
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
                      ? ['', 'Invoice', 'Customer', 'Location', 'Order Date', 'Total', 'Status', 'Payment']
                      : ['', 'Invoice', 'Customer', 'Location', 'Order Date', 'Total', 'Status', 'Sales Rep', 'Payment']
                    ).map((h, hi) => (
                      <th key={h || `col-${hi}`} className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={isRep ? 8 : 9} className="px-4 py-8 text-center text-sm text-gray-400">
                        No orders match your search.
                      </td>
                    </tr>
                  ) : filtered.map((order: any) => {
                    const client = order._client
                    const isOpen = !!expandedRows[order.id]
                    return (
                      <Fragment key={order.id}>
                        <tr className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                          <td className="px-2 py-3">
                            <button
                              type="button"
                              onClick={() => setExpandedRows(prev => ({ ...prev, [order.id]: !prev[order.id] }))}
                              className="text-gray-400 hover:text-gray-700 p-1"
                              aria-label="Toggle order details"
                            >
                              {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                            </button>
                          </td>
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
                          <td className="px-4 py-3 text-gray-600">{order._location || '—'}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{order.date}</td>
                          <td className="px-4 py-3 font-medium">{order.total_formatted}</td>
                          <td className="px-4 py-3"><Badge variant={statusVariant(order.status)}>{statusLabel(order.status)}</Badge></td>
                          {!isRep && <td className="px-4 py-3 text-gray-600">{order._salesRep || '—'}</td>}
                          <td className="px-4 py-3 text-gray-600">{order.payment_method || '—'}</td>
                        </tr>

                        {/* Full order details — every product, quantity, unit price, plus shipping */}
                        {isOpen && (
                          <tr className="bg-gray-50/50 border-b border-gray-100">
                            <td colSpan={isRep ? 8 : 9} className="px-4 py-4">
                              <div className="pl-6 space-y-3 max-w-2xl">
                                <p className="text-xs font-medium text-gray-500">
                                  {order.itemCount} item{order.itemCount !== 1 ? 's' : ''} total
                                </p>
                                <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="border-b border-gray-100">
                                        <th className="text-left px-3 py-2 font-medium text-gray-400 uppercase tracking-wide">Product</th>
                                        <th className="text-left px-3 py-2 font-medium text-gray-400 uppercase tracking-wide">SKU</th>
                                        <th className="text-right px-3 py-2 font-medium text-gray-400 uppercase tracking-wide">Qty</th>
                                        <th className="text-right px-3 py-2 font-medium text-gray-400 uppercase tracking-wide">Unit price</th>
                                        <th className="text-right px-3 py-2 font-medium text-gray-400 uppercase tracking-wide">Line total</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {(order.lineItems || []).map((item: any, li: number) => (
                                        <tr key={li} className="border-b border-gray-50 last:border-0">
                                          <td className="px-3 py-2 text-gray-800">{item.name}</td>
                                          <td className="px-3 py-2 font-mono text-gray-400">{item.sku || '—'}</td>
                                          <td className="px-3 py-2 text-right text-gray-600">{item.quantity}</td>
                                          <td className="px-3 py-2 text-right text-gray-600">${item.unitPrice.toFixed(2)}</td>
                                          <td className="px-3 py-2 text-right font-medium text-gray-900">${item.lineTotal.toFixed(2)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                  <div><span className="text-gray-400">Subtotal: </span><span className="text-gray-700">${(order.subtotal || 0).toFixed(2)}</span></div>
                                  <div><span className="text-gray-400">Shipping: </span><span className="text-gray-700">{order.shippingMethod || '—'} (${(order.shippingCost || 0).toFixed(2)})</span></div>
                                  <div><span className="text-gray-400">Payment method: </span><span className="text-gray-700">{order.payment_method || '—'}</span></div>
                                  <div><span className="text-gray-400">Order total: </span><span className="text-gray-900 font-medium">{order.total_formatted}</span></div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
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
