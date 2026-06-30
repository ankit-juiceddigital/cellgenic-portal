'use client'

import { useAuth } from '@/lib/auth-context'
import { useMyCommissions, useReps, useApproveCommission } from '@/hooks/useData'
import { Topbar } from '@/components/layout/Topbar'
import { Card, MetricCard } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { TableSkeleton, ErrorState } from '@/components/ui/Skeleton'
import { useState } from 'react'

export default function CommissionsPage() {
  const { isRep } = useAuth()

  if (isRep) {
    const { data, loading, error, refetch } = useMyCommissions()

    return (
      <>
        <Topbar title="My Commissions" subtitle="Your earnings and payout history" />
        <div className="p-7 space-y-6">
          {loading && <TableSkeleton />}
          {error && <ErrorState message={error} onRetry={refetch} />}
          {!loading && !error && data && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <MetricCard label="Earned this month" value={data.earned_this_month} delta={`${data.orders_count} orders`} />
                <MetricCard label="Pending payout" value={data.pending_payout} deltaType="neutral" delta="Awaiting approval" />
                <MetricCard label="Total earned (YTD)" value={data.ytd_earned} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900 mb-3">Commission breakdown — this month</h2>
                <Card>
                  {data.orders.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-gray-400">No orders yet this month.</p>
                  ) : data.orders.map((entry: any, i: number) => (
                    <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{entry.client}</p>
                        <p className="text-xs text-gray-400 font-mono">{entry.order} · {entry.date}</p>
                      </div>
                      <div className="text-xs text-gray-400">{entry.sale} × {entry.rate}</div>
                      <div className="text-sm font-semibold text-brand">{entry.amount}</div>
                    </div>
                  ))}
                </Card>
              </div>
            </>
          )}
        </div>
      </>
    )
  }

  // Manager / Admin view
  const { data: reps, loading, error, refetch } = useReps()
  const { approve, processing } = useApproveCommission()
  const [approved, setApproved] = useState<number[]>([])

  return (
    <>
      <Topbar
        title="Commission Management"
        subtitle="Approve and manage all rep commissions"
      />
      <div className="p-7">
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
                  {(reps || []).length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">No reps found.</td></tr>
                  ) : (reps || []).map((rep: any) => (
                    <tr key={rep.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-medium text-gray-900">{rep.name}</td>
                      <td className="px-4 py-3 text-gray-600">{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</td>
                      <td className="px-4 py-3 text-gray-600">{rep.revenue}</td>
                      <td className="px-4 py-3 text-gray-600">10%</td>
                      <td className="px-4 py-3 font-semibold text-brand">{rep.commission}</td>
                      <td className="px-4 py-3">
                        {approved.includes(rep.id) ? (
                          <Badge variant="teal">Approved</Badge>
                        ) : (
                          <Badge variant="amber">Pending</Badge>
                        )}
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
