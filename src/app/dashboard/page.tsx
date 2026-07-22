'use client'

// File: src/app/dashboard/page.tsx

import { useAuth } from '@/lib/auth-context'
import { useClients, useReps, usePendingProviders, useLeaderboard } from '@/hooks/useData'
import { Topbar } from '@/components/layout/Topbar'
import { MetricCard, Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { MetricsSkeleton, TableSkeleton, ErrorState } from '@/components/ui/Skeleton'
import { AlertTriangle, Phone, Clock, FileText } from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const { user, isRep, isManager, isAdmin } = useAuth()
  const { data: clients, loading: clientsLoading, error: clientsError } = useClients()
  const { data: reps, loading: repsLoading } = useReps()
  const { data: pending } = usePendingProviders()

  const atRiskClients = clients?.filter((c: any) => c.at_risk) || []
  const recentOrders = clients?.flatMap((c: any) => c.recent_orders || []).slice(0, 5) || []
  const { leaderboard } = useLeaderboard()
  const myRankData = leaderboard?.find((r: any) => r.rep_code === user?.repCode)
  

  // ── REP VIEW ──
  if (isRep) {
    if (clientsLoading) return (
      <>
        <Topbar title="My Dashboard" subtitle="Overview of your clients and activity" />
        <div className="p-4 md:p-7"><MetricsSkeleton /><TableSkeleton /></div>
      </>
    )
    if (clientsError) return (
      <>
        <Topbar title="My Dashboard" />
        <div className="p-4 md:p-7"><ErrorState message={clientsError} /></div>
      </>
    )

    return (
      <>
        <Topbar title="My Dashboard" subtitle="Overview of your clients and activity" />
        <div className="p-4 md:p-7 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard label="My clients" value={String(clients?.length || 0)} delta="+1 this month" href="/clients" />
            <MetricCard label="Orders this month" value={String(clients?.reduce((s: number, c: any) => s + (c.orders_this_month || 0), 0) || 0)} delta="vs last month" href="/orders" />
            <MetricCard label="At-risk clients" value={String(atRiskClients.length)} deltaType={atRiskClients.length > 0 ? 'negative' : 'positive'} delta={atRiskClients.length > 0 ? '30+ days no order' : 'All active'} href="/clients?filter=at-risk" />
            <MetricCard
              label="My rank"
              value={myRankData ? `${myRankData.rank === 1 ? '🥇' : myRankData.rank === 2 ? '🥈' : '🥉'} ${myRankData.rank === 1 ? '1st' : myRankData.rank === 2 ? '2nd' : `${myRankData.rank}th`}` : '—'}
              delta="View leaderboard →"
              deltaType="neutral"
              href="/leaderboard"
            />
          </div>

          {atRiskClients.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-center gap-3">
              <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
              <p className="text-sm font-medium text-amber-700">
                {atRiskClients.length} client{atRiskClients.length > 1 ? 's' : ''} haven't ordered in 30+ days
              </p>
              <Link href="/clients" className="ml-auto">
                <Button size="sm">Review</Button>
              </Link>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900">Recent client orders</h2>
              <Link href="/clients"><Button size="sm">View all clients</Button></Link>
            </div>
            <Card>
              {recentOrders.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {['Client', 'Order', 'Products', 'Amount', 'Status'].map(h => (
                          <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrders.map((order: any, i: number) => (
                        <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">{order.client_name}</p>
                            <p className="text-xs text-gray-400">{order.clinic}</p>
                          </td>
                          <td className="px-4 py-3 text-xs font-mono text-gray-400">{order.number}</td>
                          <td className="px-4 py-3 text-gray-600">{order.products}</td>
                          <td className="px-4 py-3 font-medium">{order.total}</td>
                          <td className="px-4 py-3"><Badge variant="teal">Fulfilled</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="px-4 py-6 text-sm text-gray-400">No recent orders.</p>
              )}
            </Card>
          </div>

          {/* Activity alerts */}
          <div>
            <h2 className="text-sm font-semibold text-gray-900 mb-3">
              Client activity alerts <span className="text-gray-400 font-normal text-xs">— 30+ days no order</span>
            </h2>
            <Card>
              {atRiskClients.length > 0 ? atRiskClients.map((cl: any) => (
                <div key={cl.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cl.days_since >= 60 ? 'bg-red-400' : 'bg-amber-400'}`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{cl.name}</p>
                    <p className="text-xs text-gray-400">{cl.clinic} · Last order {cl.last_order}</p>
                  </div>
                  <Badge variant={cl.days_since >= 60 ? 'red' : 'amber'}>{cl.days_since}d ago</Badge>
                  <Link href={`/clients/${cl.id}`}>
                    <Button size="sm">Follow up</Button>
                  </Link>
                </div>
              )) : (
                <p className="px-4 py-5 text-sm text-gray-400">All clients ordered within the last 30 days. 🎉</p>
              )}
            </Card>
          </div>
        </div>
      </>
    )
  }

  // ── MANAGER VIEW ──
  if (isManager) {
    if (clientsLoading || repsLoading) return (
      <>
        <Topbar title="Sales Overview" subtitle="June 2026 performance across all reps" />
        <div className="p-4 md:p-7"><MetricsSkeleton /><TableSkeleton /></div>
      </>
    )

    return (
      <>
        <Topbar title="Sales Overview" subtitle="Performance across all reps" />
        <div className="p-4 md:p-7 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard label="Total clients" value={String(clients?.length || 0)} delta="Active providers" href="/clients" />
            <MetricCard label="At-risk clients" value={String(atRiskClients.length)} deltaType={atRiskClients.length > 0 ? 'negative' : 'positive'} delta="30+ days no order" href="/clients?filter=at-risk" />
            <MetricCard label="Active reps" value={String(reps?.length || 0)} delta="All active" deltaType="neutral" href="/reps" />
            <MetricCard label="Orders this month" value={String((reps || []).reduce((s: number, r: any) => s + (r.ordersMonth || 0), 0))} deltaType="neutral" delta="Across all reps" href="/orders" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900">Rep performance</h2>
              <Link href="/reps"><Button size="sm">Full breakdown</Button></Link>
            </div>
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {['Rank', 'Rep', 'Clients', 'Orders', 'Trend'].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(reps || [])
                      .sort((a: any, b: any) => b.ordersMonth - a.ordersMonth)
                      .map((rep: any, i: number) => (
                        <tr key={rep.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                          <td className="px-4 py-3 text-xl">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</td>
                          <td className="px-4 py-3">
                            <Link href={`/reps/${rep.id}`} className="font-medium text-gray-900 hover:text-brand hover:underline">
                              {rep.name}
                            </Link>
                            <p className="text-xs text-gray-400 font-mono">Code: {rep.rep_code}</p>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{rep.clients}</td>
                          <td className="px-4 py-3 text-gray-600">{rep.ordersMonth || 0}</td>
                          <td className="px-4 py-3"><Badge variant="green">Active</Badge></td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      </>
    )
  }

  // ── ADMIN VIEW ──
  // Total platform revenue this month, derived from the per-rep revenue
  // figures already computed server-side (cellgenic_get_reps) — avoids an
  // extra round trip just to get a sum.
  const totalRevenue = (reps || []).reduce((sum: number, r: any) => {
    const n = parseFloat(String(r.revenue || '0').replace(/[^0-9.-]/g, ''))
    return sum + (isNaN(n) ? 0 : n)
  }, 0)
  const ordersThisMonth = (reps || []).reduce((s: number, r: any) => s + (r.ordersMonth || 0), 0)

  return (
    <>
      <Topbar title="Platform Overview" subtitle="Full platform visibility" />
      <div className="p-4 md:p-7 space-y-6">
        {/* Row 1 — providers, approvals, reps, at-risk */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Total providers" value={String(clients?.length || 0)} delta="View all →" deltaType="neutral" href="/clients" />
          <MetricCard label="Pending approvals" value={String(pending?.length || 0)} delta="Review now →" deltaType={pending?.length > 0 ? 'negative' : 'positive'} href="/approvals" />
          <MetricCard label="Active reps" value={String(reps?.length || 0)} delta="View reps →" deltaType="neutral" href="/reps" />
          <MetricCard label="At-risk clients" value={String(atRiskClients.length)} deltaType={atRiskClients.length > 0 ? 'negative' : 'positive'} delta="30+ days no order" href="/clients?filter=at-risk" />
        </div>

        {/* Row 2 — full platform activity: orders, revenue, unassigned, inventory */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Orders this month" value={String(ordersThisMonth)} delta="View all orders →" deltaType="neutral" href="/orders" />
          <MetricCard label="Revenue this month" value={`$${totalRevenue.toLocaleString()}`} delta="Across all reps" deltaType="neutral" href="/orders" />
          <MetricCard
            label="Unassigned providers"
            value={String((clients || []).filter((c: any) => !c.assigned_rep_code).length)}
            delta="Assign to a rep →"
            deltaType="neutral"
            href="/unassigned"
          />
          <MetricCard label="Inventory" value="View stock" delta="Products & availability →" deltaType="neutral" href="/inventory" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900">Pending provider approvals</h2>
              <Link href="/approvals"><Button size="sm">Review all</Button></Link>
            </div>
            <Card>
              {(pending || []).slice(0, 3).map((p: any) => (
                <Link
                  key={p.id}
                  href="/approvals"
                  className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.clinic} · {p.country}</p>
                  </div>
                  <Badge variant="blue">Pending</Badge>
                </Link>
              ))}
              {(!pending || pending.length === 0) && (
                <p className="px-4 py-5 text-sm text-gray-400">No pending approvals.</p>
              )}
            </Card>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-gray-900 mb-3">At-risk clients</h2>
            <Card>
              {atRiskClients.slice(0, 5).map((cl: any) => (
                <Link
                  key={cl.id}
                  href={`/clients/${cl.id}`}
                  className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
                >
                  <AlertTriangle size={14} className="text-amber-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{cl.name}</p>
                    <p className="text-xs text-gray-400">{cl.clinic} · Rep: {cl.assigned_rep}</p>
                  </div>
                  <Badge variant="amber" className="ml-auto">{cl.days_since}d</Badge>
                </Link>
              ))}
              {atRiskClients.length === 0 && (
                <p className="px-4 py-5 text-sm text-gray-400">No at-risk clients.</p>
              )}
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}
