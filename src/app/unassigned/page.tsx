'use client'
// File: src/app/unassigned/page.tsx

import { useState } from 'react'
import { useAllClients, useReps, useAssignClient, useClientAccess } from '@/hooks/useData'
import { Topbar } from '@/components/layout/Topbar'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { TableSkeleton, ErrorState } from '@/components/ui/Skeleton'
import { ShieldOff, ShieldCheck, Trash2 } from 'lucide-react'

export default function UnassignedPage() {
  const { data: clients, loading, error, refetch } = useAllClients()
  const { data: reps } = useReps()
  const { assign, processing } = useAssignClient()
  const { deactivate, reactivate, remove, processing: accessProcessing, error: accessError } = useClientAccess()
  const [selections, setSelections] = useState<Record<number, string>>({})
  const [assigned, setAssigned] = useState<number[]>([])
  const [statusOverride, setStatusOverride] = useState<Record<number, 'active' | 'deactivated'>>({})
  const [deletedIds, setDeletedIds] = useState<number[]>([])

  const unassigned = (clients || []).filter((c: any) => !c.assigned_rep && !assigned.includes(c.id) && !deletedIds.includes(c.id))
  const statusFor = (client: any): 'active' | 'deactivated' =>
    statusOverride[client.id] || (client.account_status === 'deactivated' ? 'deactivated' : 'active')

  return (
    <>
      <Topbar
        title="Unassigned Clients"
        subtitle="Providers registered without a referral code"
        actions={<span className="text-xs text-gray-400">{unassigned.length} pending assignment</span>}
      />
      <div className="p-4 md:p-7">
        <p className="text-sm text-gray-400 mb-4">These providers registered without a referral code. Assign them to a rep below.</p>
        {accessError && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600">
            {accessError}
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
                    {['Provider', 'Country', 'Registered', 'Access', 'Assign to rep', ''].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {unassigned.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">All providers are assigned to a rep.</td></tr>
                  ) : unassigned.map((client: any) => (
                    <tr key={client.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{client.name}</p>
                        <p className="text-xs text-gray-400">{client.clinic}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{client.country}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{client.registered || '—'}</td>
                      <td className="px-4 py-3">
                        {statusFor(client) === 'deactivated' ? (
                          <Badge variant="red">Deactivated</Badge>
                        ) : (
                          <Badge variant="green">Active</Badge>
                        )}
                      </td>
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
                        <div className="flex items-center gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={processing || !selections[client.id]}
                            onClick={() => assign(client.id, selections[client.id], () => setAssigned(prev => [...prev, client.id]))}
                          >
                            Assign
                          </Button>
                          {statusFor(client) === 'deactivated' ? (
                            <Button
                              size="sm"
                              className="border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                              disabled={accessProcessing === client.id}
                              onClick={() => reactivate(client.id, () => setStatusOverride(prev => ({ ...prev, [client.id]: 'active' })))}
                            >
                              <ShieldCheck size={13} />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              className="border-red-200 text-red-600 hover:bg-red-50"
                              disabled={accessProcessing === client.id}
                              onClick={() => {
                                if (confirm(`Revoke platform access for ${client.name}?`)) {
                                  deactivate(client.id, () => setStatusOverride(prev => ({ ...prev, [client.id]: 'deactivated' })))
                                }
                              }}
                            >
                              <ShieldOff size={13} />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            className="border-red-300 text-red-700 hover:bg-red-50"
                            disabled={accessProcessing === client.id}
                            onClick={() => {
                              const typed = window.prompt(
                                `This permanently deletes ${client.name}'s account and ALL of their order history. This cannot be undone.\n\nType the client's name exactly to confirm:\n"${client.name}"`
                              )
                              if (typed === null) return
                              if (typed === client.name) {
                                remove(client.id, () => setDeletedIds(prev => [...prev, client.id]))
                              } else {
                                alert('Name did not match — nothing was deleted.')
                              }
                            }}
                          >
                            <Trash2 size={13} />
                          </Button>
                        </div>
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
