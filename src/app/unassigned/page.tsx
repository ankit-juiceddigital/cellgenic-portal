'use client'
// File: src/app/unassigned/page.tsx

import { useState } from 'react'
import { useAllClients, useReps, useAssignClient } from '@/hooks/useData'
import { Topbar } from '@/components/layout/Topbar'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { TableSkeleton, ErrorState } from '@/components/ui/Skeleton'

export default function UnassignedPage() {
  const { data: clients, loading, error, refetch } = useAllClients()
  const { data: reps } = useReps()
  const { assign, processing } = useAssignClient()
  const [selections, setSelections] = useState<Record<number, string>>({})
  const [assigned, setAssigned] = useState<number[]>([])

  const unassigned = (clients || []).filter((c: any) => !c.assigned_rep && !assigned.includes(c.id))

  return (
    <>
      <Topbar
        title="Unassigned Clients"
        subtitle="Providers registered without a referral code"
        actions={<span className="text-xs text-gray-400">{unassigned.length} pending assignment</span>}
      />
      <div className="p-7">
        <p className="text-sm text-gray-400 mb-4">These providers registered without a referral code. Assign them to a rep below.</p>
        {loading && <TableSkeleton />}
        {error && <ErrorState message={error} onRetry={refetch} />}
        {!loading && !error && (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Provider', 'Country', 'Registered', 'Assign to rep', ''].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {unassigned.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">All providers are assigned to a rep.</td></tr>
                  ) : unassigned.map((client: any) => (
                    <tr key={client.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{client.name}</p>
                        <p className="text-xs text-gray-400">{client.clinic}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{client.country}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{client.registered || '—'}</td>
                      <td className="px-4 py-3">
                        <select
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-brand"
                          value={selections[client.id] || ''}
                          onChange={e => setSelections(prev => ({ ...prev, [client.id]: e.target.value }))}
                        >
                          <option value="">Select rep...</option>
                          {(reps || []).map((r: any) => (
                            <option key={r.id} value={r.rep_code}>{r.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={processing || !selections[client.id]}
                          onClick={() => assign(client.id, selections[client.id], () => setAssigned(prev => [...prev, client.id]))}
                        >
                          Assign
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
