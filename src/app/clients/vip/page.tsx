'use client'
// File: src/app/clients/vip/page.tsx

import { useState } from 'react'
import { useVipClients, useClientAccess } from '@/hooks/useData'
import { useAuth } from '@/lib/auth-context'
import { Topbar } from '@/components/layout/Topbar'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { TableSkeleton, ErrorState } from '@/components/ui/Skeleton'
import { ShieldOff, ShieldCheck, Trash2 } from 'lucide-react'
import Link from 'next/link'

export default function VipClientsPage() {
  const { isAdmin, isManager } = useAuth()
  const canManageAccess = isAdmin || isManager
  const { data: clients, loading, error, refetch } = useVipClients()
  const { deactivate, reactivate, remove, processing, error: accessError } = useClientAccess()
  const [statusOverride, setStatusOverride] = useState<Record<number, 'active' | 'deactivated'>>({})
  const [deletedIds, setDeletedIds] = useState<number[]>([])

  const filtered = (clients || []).filter((c: any) => !deletedIds.includes(c.id))
  const statusFor = (client: any): 'active' | 'deactivated' =>
    statusOverride[client.id] || (client.account_status === 'deactivated' ? 'deactivated' : 'active')

  return (
    <>
      <Topbar title="VIP Clients" subtitle="Providers flagged as VIP" />
      <div className="p-4 md:p-7">
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
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Provider</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Country</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Last order</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Total orders</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Status</th>
                    {canManageAccess && <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Access</th>}
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">
                        No VIP clients found.
                      </td>
                    </tr>
                  ) : filtered.map((client: any) => (
                    <tr key={client.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{client.name}</p>
                        <p className="text-xs text-gray-400">{client.clinic}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{client.country}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{client.last_order || 'Never'}</td>
                      <td className="px-4 py-3 text-gray-600">{client.total_orders}</td>
                      <td className="px-4 py-3">
                        <Badge variant={client.at_risk ? 'amber' : 'teal'}>
                          {client.at_risk ? 'At risk' : 'Active'}
                        </Badge>
                      </td>
                      {canManageAccess && (
                        <td className="px-4 py-3">
                          {statusFor(client) === 'deactivated' ? (
                            <Badge variant="red">Deactivated</Badge>
                          ) : (
                            <Badge variant="green">Active</Badge>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link href={`/clients/${client.id}`}>
                            <Button size="sm">View</Button>
                          </Link>
                          {canManageAccess && (
                            statusFor(client) === 'deactivated' ? (
                              <Button
                                size="sm"
                                className="border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                                disabled={processing === client.id}
                                onClick={() => reactivate(client.id, () => setStatusOverride(prev => ({ ...prev, [client.id]: 'active' })))}
                              >
                                <ShieldCheck size={13} /> {processing === client.id ? 'Restoring...' : 'Reactivate'}
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                className="border-red-200 text-red-600 hover:bg-red-50"
                                disabled={processing === client.id}
                                onClick={() => {
                                  if (confirm(`Revoke platform access for ${client.name}? They will no longer be able to log in or place orders until reactivated.`)) {
                                    deactivate(client.id, () => setStatusOverride(prev => ({ ...prev, [client.id]: 'deactivated' })))
                                  }
                                }}
                              >
                                <ShieldOff size={13} /> {processing === client.id ? 'Revoking...' : 'Deactivate'}
                              </Button>
                            )
                          )}
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