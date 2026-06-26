'use client'

import { useAuth } from '@/lib/auth-context'
import { Topbar } from '@/components/layout/Topbar'
import { Card, MetricCard } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { REPS, COMMISSIONS } from '@/data/mock'

export default function CommissionsPage() {
  const { isRep } = useAuth()

  if (isRep) {
    return (
      <>
        <Topbar title="My Commissions" subtitle="Your earnings and payout history" />
        <div className="p-7 space-y-6">
          <div className="grid grid-cols-3 gap-3">
            <MetricCard label="Earned this month" value="$820" delta="10% on $8,200" />
            <MetricCard label="Pending payout" value="$820" delta="Approved Jul 1" deltaType="neutral" />
            <MetricCard label="Total earned (YTD)" value="$4,380" delta="Since Jan 2026" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Commission breakdown — June 2026</h2>
            <Card>
              {COMMISSIONS.map((entry, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{entry.client}</p>
                    <p className="text-xs text-gray-400 font-mono">{entry.order}</p>
                  </div>
                  <div className="text-xs text-gray-400">{entry.sale} × {entry.rate}</div>
                  <div className="text-sm font-semibold text-brand">{entry.amount}</div>
                </div>
              ))}
            </Card>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Topbar
        title="Commission Management"
        subtitle="Approve and manage all rep commissions"
        actions={<Button variant="primary" size="sm">Approve all</Button>}
      />
      <div className="p-7">
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
                {REPS.map((rep, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-900">{rep.name}</td>
                    <td className="px-4 py-3 text-gray-600">June 2026</td>
                    <td className="px-4 py-3 text-gray-600">{rep.revenue}</td>
                    <td className="px-4 py-3 text-gray-600">10%</td>
                    <td className="px-4 py-3 font-semibold text-brand">{rep.commission}</td>
                    <td className="px-4 py-3"><Badge variant="amber">Pending</Badge></td>
                    <td className="px-4 py-3"><Button size="sm">Approve</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  )
}
