'use client'
// File: src/app/reps/page.tsx

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useReps } from '@/hooks/useData'
import { Topbar } from '@/components/layout/Topbar'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { TableSkeleton, ErrorState } from '@/components/ui/Skeleton'
import { EditRepModal } from '@/components/EditRepModal'

export default function RepsPage() {
  const { isAdmin } = useAuth()
  const { data: reps, loading, error, refetch } = useReps()
  const [editingRepId, setEditingRepId] = useState<number | null>(null)

  const sorted = (reps || []).sort((a: any, b: any) => b.ordersMonth - a.ordersMonth)

  return (
    <>
      <Topbar
        title={isAdmin ? 'Sales Representatives' : 'Rep Performance'}
        subtitle={isAdmin ? 'Manage rep accounts and codes' : 'Individual rep metrics this month'}
      />
      <div className="p-4 md:p-7">
        {loading && <TableSkeleton />}
        {error && <ErrorState message={error} onRetry={refetch} />}
        {!loading && !error && (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Rank', 'Rep', 'Code', 'Clients', 'Orders (this month)', 'Trend', ...(isAdmin ? [''] : [])].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((rep: any, i: number) => (
                    <tr key={rep.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-xl">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{rep.name}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs bg-gray-50 border border-gray-100 px-2 py-0.5 rounded">{rep.rep_code}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{rep.clients}</td>
                      <td className="px-4 py-3 text-gray-600">{rep.ordersMonth || 0}</td>
                      <td className="px-4 py-3"><Badge variant="green">Active</Badge></td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <Button size="sm" onClick={() => setEditingRepId(rep.id)}>
                            Edit
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {sorted.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">No reps found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {editingRepId !== null && (
        <EditRepModal
          repId={editingRepId}
          onClose={() => setEditingRepId(null)}
          onSaved={() => refetch()}
        />
      )}
    </>
  )
}
