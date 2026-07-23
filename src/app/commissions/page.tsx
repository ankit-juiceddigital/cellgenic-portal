'use client'
// File: src/app/commissions/page.tsx

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useMyCommissions, useReps, useApproveCommission } from '@/hooks/useData'
import { Topbar } from '@/components/layout/Topbar'
import { Card, MetricCard } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { TableSkeleton, ErrorState } from '@/components/ui/Skeleton'
import { X, Package, Truck, CreditCard, User, MapPin } from 'lucide-react'

// ─────────────────────────────────────────────
// Order Detail Modal
// ─────────────────────────────────────────────
function OrderModal({
  orderId,
  onClose,
}: {
  orderId: string
  onClose: () => void
}) {
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch order when modal mounts
  useState(() => {
    fetch(`/api/orders/${orderId}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setOrder(data)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  })

  const statusColors: Record<string, string> = {
    processing: 'badge-blue',
    completed: 'badge-teal',
    pending: 'badge-amber',
    cancelled: 'badge-red',
    refunded: 'badge-gray',
    'on-hold': 'badge-amber',
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {order ? order.number : 'Order details'}
            </p>
            {order && (
              <p className="text-xs text-gray-400 mt-0.5">{order.date}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {loading && (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="h-4 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          {order && (
            <>
              {/* Status */}
              <div className="flex items-center gap-2">
                <Badge variant={statusColors[order.status] as any || 'gray'}>
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </Badge>
                {order.payment_method && (
                  <span className="text-xs text-gray-400">via {order.payment_method}</span>
                )}
              </div>

              {/* Customer info */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <User size={13} className="text-gray-400" />
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</span>
                </div>
                <p className="text-sm font-medium text-gray-900">{order.customer.name}</p>
                {order.customer.company && (
                  <p className="text-xs text-gray-500">{order.customer.company}</p>
                )}
                <p className="text-xs text-gray-400">{order.customer.email}</p>
                {order.customer.phone && (
                  <p className="text-xs text-gray-400">{order.customer.phone}</p>
                )}
              </div>

              {/* Shipping address */}
              {order.shipping_address && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin size={13} className="text-gray-400" />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ship to</span>
                  </div>
                  <p className="text-sm text-gray-700">{order.shipping_address}</p>
                </div>
              )}

              {/* Line items */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Package size={13} className="text-gray-400" />
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Products ({order.line_items.length})
                  </span>
                </div>
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  {order.line_items.map((item: any, i: number) => (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between px-4 py-3 ${
                        i < order.line_items.length - 1 ? 'border-b border-gray-50' : ''
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 font-medium truncate">{item.name}</p>
                        {item.sku && (
                          <p className="text-xs text-gray-400 font-mono">{item.sku}</p>
                        )}
                      </div>
                      <div className="text-right ml-4 flex-shrink-0">
                        <p className="text-xs text-gray-400">× {item.quantity}</p>
                        <p className="text-sm font-medium text-gray-700">{item.subtotal}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shipping method */}
              {order.shipping_lines.length > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Truck size={13} />
                    <span>{order.shipping_lines[0].method}</span>
                  </div>
                  <span className="text-gray-600">{order.shipping_lines[0].total}</span>
                </div>
              )}

              {/* Totals */}
              <div className="border-t border-gray-100 pt-4 space-y-2">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Subtotal</span>
                  <span>{order.subtotal}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Shipping</span>
                  <span>{order.shipping_total}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold text-gray-900 pt-2 border-t border-gray-100">
                  <span>Total</span>
                  <span>{order.total}</span>
                </div>
              </div>

              {/* Customer note */}
              {order.customer_note && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                  <p className="text-xs font-semibold text-amber-600 mb-1">Customer note</p>
                  <p className="text-sm text-amber-800">{order.customer_note}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}


// ─────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────
export default function CommissionsPage() {
  const { isRep, user } = useAuth()
  const [viewingOrderId, setViewingOrderId] = useState<string | null>(null)

  // Extract numeric order ID from strings like "#CG-4421"
  const getOrderId = (orderStr: string) => orderStr.replace(/\D/g, '')

  if (isRep) {
    const { data, loading, error, refetch } = useMyCommissions()

    return (
      <>
        <Topbar title="My Commissions" subtitle="Your earnings and payout history" />
        <div className="p-4 md:p-7 space-y-6">
          {loading && <TableSkeleton />}
          {error && <ErrorState message={error} onRetry={refetch} />}
          {!loading && !error && data && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <MetricCard label="Earned this month" value={data.earned_this_month} delta={`${data.orders_count} orders`} />
                <MetricCard label="Pending payout" value={data.pending_payout} deltaType="neutral" delta="Awaiting approval" />
                <MetricCard label="Total earned (YTD)" value={data.ytd_earned} />
              </div>

              <div>
                <h2 className="text-sm font-semibold text-gray-900 mb-3">
                  Commission breakdown — this month
                </h2>
                <Card>
                  {data.orders.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-gray-400">No orders yet this month.</p>
                  ) : data.orders.map((entry: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center gap-4 px-4 py-3 border-b border-gray-50 last:border-0"
                    >
                      {/* Client + order number */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{entry.client}</p>
                        <p className="text-xs text-gray-400 font-mono">{entry.order} · {entry.date}</p>
                      </div>

                      {/* Products summary */}
                      <div className="hidden md:block flex-1 min-w-0">
                        <p className="text-xs text-gray-500 truncate">{entry.products}</p>
                      </div>

                      {/* Sale amount */}
                      <div className="text-xs text-gray-400 flex-shrink-0">
                        {entry.sale} × {entry.rate}
                      </div>

                      {/* Commission earned */}
                      <div className="text-sm font-semibold text-brand flex-shrink-0 w-16 text-right">
                        {entry.amount}
                      </div>

                      {/* View order button */}
                      <Button
                        size="sm"
                        onClick={() => setViewingOrderId(getOrderId(entry.order))}
                        className="flex-shrink-0"
                      >
                        View
                      </Button>
                    </div>
                  ))}
                </Card>
              </div>
            </>
          )}
        </div>

        {viewingOrderId && (
          <OrderModal
            orderId={viewingOrderId}
            onClose={() => setViewingOrderId(null)}
          />
        )}
      </>
    )
  }

  // Manager / Admin view
  const { data: reps, loading, error, refetch } = useReps()
  const { approve, processing } = useApproveCommission()
  const [approved, setApproved] = useState<number[]>([])
  // Whoever is looking at this screen shouldn't see (or approve) their
  // own commission entry — same conflict-of-interest reasoning as
  // excluding yourself from the "Assign to rep" dropdown.
  const approvableReps = (reps || []).filter((r: any) => r.id !== user?.userId)

  return (
    <>
      <Topbar title="Commission Management" subtitle="Approve and manage all rep commissions" />
      <div className="p-4 md:p-7">
        {loading && <TableSkeleton />}
        {error && <ErrorState message={error} onRetry={refetch} />}
        {!loading && !error && (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Rep', 'Month', 'Revenue generated', 'Rate', 'Commission', 'Status', ''].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {approvableReps.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">No reps found.</td></tr>
                  ) : approvableReps.map((rep: any) => (
                    <tr key={rep.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-medium text-gray-900">{rep.name}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{rep.revenue}</td>
                      <td className="px-4 py-3 text-gray-600">{rep.commission_rate ? `${rep.commission_rate}%` : '10%'}</td>
                      <td className="px-4 py-3 font-semibold text-brand">{rep.commission}</td>
                      <td className="px-4 py-3">
                        {approved.includes(rep.id)
                          ? <Badge variant="teal">Approved</Badge>
                          : <Badge variant="amber">Pending</Badge>}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          disabled={processing === rep.id || approved.includes(rep.id)}
                          onClick={() => approve(rep.id, () => setApproved(prev => [...prev, rep.id]))}
                        >
                          {processing === rep.id ? 'Approving...' : approved.includes(rep.id) ? 'Approved' : 'Approve'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </>
  )
}
