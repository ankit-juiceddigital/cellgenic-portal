'use client'

// File: src/app/clients/page.tsx

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useClients, useClientAccess } from '@/hooks/useData'
import { Topbar } from '@/components/layout/Topbar'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { TableSkeleton, ErrorState } from '@/components/ui/Skeleton'
import { Search, Link2, ShieldOff, ShieldCheck, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

export default function ClientsPage() {
  const { isRep, isAdmin } = useAuth()
  const { data: clients, loading, error, refetch } = useClients()
  const [query, setQuery] = useState('')
  const searchParams = useSearchParams()
  // Supports drilling in from a dashboard metric, e.g. /clients?filter=at-risk
  const [onlyAtRisk, setOnlyAtRisk] = useState(searchParams.get('filter') === 'at-risk')
  const { deactivate, reactivate, remove, processing, error: accessError } = useClientAccess()
  // Optimistic local overlay so the row updates immediately without
  // waiting on a full refetch of the clients list.
  const [statusOverride, setStatusOverride] = useState<Record<number, 'active' | 'deactivated'>>({})
  // Deleted clients disappear from the list entirely (unlike deactivate,
  // which just changes status) — tracked locally until the next refetch.
  const [deletedIds, setDeletedIds] = useState<number[]>([])

  const filtered = (clients || []).filter((c: any) => {
    if (deletedIds.includes(c.id)) return false
    const matchesQuery =
      c.name?.toLowerCase().includes(query.toLowerCase()) ||
      c.clinic?.toLowerCase().includes(query.toLowerCase()) ||
      c.country?.toLowerCase().includes(query.toLowerCase())
    const matchesRisk = !onlyAtRisk || c.at_risk
    return matchesQuery && matchesRisk
  })

  const statusFor = (client: any): 'active' | 'deactivated' =>
    statusOverride[client.id] || (client.account_status === 'deactivated' ? 'deactivated' : 'active')

  return (
    <>
      <Topbar
        title={isRep ? 'My Clients' : 'All Clients'}
        subtitle={isRep ? 'Providers registered under your referral code' : 'All active provider accounts'}
        actions={
          isRep ? (
            <Link href="/referral">
              <Button variant="primary" size="sm"><Link2 size={14} /> Share referral link</Button>
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              {onlyAtRisk && (
                <button
                  onClick={() => setOnlyAtRisk(false)}
                  className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
                >
                  At-risk only ✕
                </button>
              )}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-brand w-52"
                />
              </div>
            </div>
          )
        }
      />
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
                    {!isRep && <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Assigned rep</th>}
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Last order</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Days since</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Total orders</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Roles</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Status</th>
                    {isAdmin && <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Access</th>}
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">
                        {query ? 'No clients match your search.' : onlyAtRisk ? 'No at-risk clients right now.' : 'No clients found.'}
                      </td>
                    </tr>
                  ) : filtered.map((client: any) => (
                    <tr key={client.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{client.name}</p>
                        <p className="text-xs text-gray-400">{client.clinic}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{client.country}</td>
                      {!isRep && (
                        <td className="px-4 py-3">
                          <p className="text-gray-700">{client.assigned_rep || '—'}</p>
                        </td>
                      )}
                      <td className="px-4 py-3 text-gray-500 text-xs">{client.last_order || 'Never'}</td>
                      <td className="px-4 py-3">
                        {client.days_since != null ? (
                          <Badge variant={client.days_since >= 60 ? 'red' : client.days_since >= 30 ? 'amber' : 'teal'}>
                            {client.days_since}d ago
                          </Badge>
                        ) : <span className="text-gray-400 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{client.total_orders}</td>
                      <td className="px-4 py-3 text-gray-600">{client.role}</td>
                      <td className="px-4 py-3">
                        <Badge variant={client.at_risk ? 'amber' : 'teal'}>
                          {client.at_risk ? 'At risk' : 'Active'}
                        </Badge>
                      </td>
                      {isAdmin && (
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
                          {isAdmin && (
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
                          {isAdmin && (
                            <Button
                              size="sm"
                              className="border-red-300 text-red-700 hover:bg-red-50"
                              disabled={processing === client.id}
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
                              <Trash2 size={13} /> {processing === client.id ? 'Deleting...' : 'Delete'}
                            </Button>
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
