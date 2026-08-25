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
import { Search, Link2, ShieldOff, ShieldCheck, Mail, Phone, MapPin, UserRound } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

export default function ClientsPage() {
  const { isRep, isAdmin, isManager } = useAuth()
  const canManageAccess = isAdmin || isRep || isManager
  const { data: clients, loading, error, refetch } = useClients()
  const [query, setQuery] = useState('')
  const searchParams = useSearchParams()
  const [onlyAtRisk, setOnlyAtRisk] = useState(searchParams.get('filter') === 'at-risk')
  const { deactivate, reactivate, processing, error: accessError } = useClientAccess()
  const [statusOverride, setStatusOverride] = useState<Record<number, 'pending' | 'active' | 'deactivated'>>({})

  const filtered = (clients || []).filter((c: any) => {
    const matchesQuery =
      c.name?.toLowerCase().includes(query.toLowerCase()) ||
      c.email?.toLowerCase().includes(query.toLowerCase()) ||
      c.phone?.toLowerCase().includes(query.toLowerCase()) ||
      c.clinic?.toLowerCase().includes(query.toLowerCase()) ||
      c.country?.toLowerCase().includes(query.toLowerCase())
    const matchesRisk = !onlyAtRisk || c.at_risk
    return matchesQuery && matchesRisk
  })

  const statusFor = (client: any): 'pending' | 'active' | 'deactivated' => {
    if (statusOverride[client.id]) return statusOverride[client.id]
    if (client.account_status === 'awaiting_admin_review') return 'pending'
    if (client.account_status === 'deactivated') return 'deactivated'
    return 'active'
  }

  const renderStatus = (client: any) => {
    const status = statusFor(client)
    if (status === 'pending') return <Badge variant="blue">Pending</Badge>
    if (status === 'deactivated') return <Badge variant="red">Deactivated</Badge>
    return <Badge variant="green">Active</Badge>
  }

  const handleDeactivate = (client: any) => {
    if (confirm(`Revoke platform access for ${client.name}? They will no longer be able to log in or place orders until reactivated.`)) {
      deactivate(client.id, () => setStatusOverride(prev => ({ ...prev, [client.id]: 'deactivated' })))
    }
  }

  const renderActions = (client: any, stacked = false) => (
    <div className={`flex ${stacked ? 'flex-wrap' : 'items-center'} gap-2`}>
      <Link href={`/clients/${client.id}`} className={stacked ? 'flex-1 min-w-[84px]' : ''}>
        <Button size="sm" className={stacked ? 'w-full justify-center' : ''}>View</Button>
      </Link>

      {canManageAccess && statusFor(client) === 'pending' && (
        <Link href="/approvals" className={stacked ? 'flex-[2] min-w-[145px]' : ''}>
          <Button size="sm" className={`border-blue-200 text-blue-600 hover:bg-blue-50 ${stacked ? 'w-full justify-center' : ''}`}>
            Review in Approvals
          </Button>
        </Link>
      )}

      {canManageAccess && statusFor(client) !== 'pending' && (
        statusFor(client) === 'deactivated' ? (
          <Button
            size="sm"
            className={`border-emerald-200 text-emerald-600 hover:bg-emerald-50 ${stacked ? 'flex-1 min-w-[120px] justify-center' : ''}`}
            disabled={processing === client.id}
            onClick={() => reactivate(client.id, () => setStatusOverride(prev => ({ ...prev, [client.id]: 'active' })))}
          >
            <ShieldCheck size={13} /> {processing === client.id ? 'Restoring...' : 'Reactivate'}
          </Button>
        ) : (
          <Button
            size="sm"
            className={`border-red-200 text-red-600 hover:bg-red-50 ${stacked ? 'flex-1 min-w-[120px] justify-center' : ''}`}
            disabled={processing === client.id}
            onClick={() => handleDeactivate(client)}
          >
            <ShieldOff size={13} /> {processing === client.id ? 'Revoking...' : 'Deactivate'}
          </Button>
        )
      )}
    </div>
  )

  return (
    <>
      <Topbar
        title={isRep ? 'My Clients' : 'All Clients'}
        subtitle={isRep ? 'Providers registered under your referral code' : 'All active provider accounts'}
        actions={
          isRep ? (
            <Link href="/referral" className="w-full sm:w-auto">
              <Button variant="primary" size="sm" className="w-full sm:w-auto justify-center">
                <Link2 size={14} /> Share referral link
              </Button>
            </Link>
          ) : (
            <div className="flex w-full sm:w-auto flex-col sm:flex-row sm:items-center gap-2">
              {onlyAtRisk && (
                <button
                  onClick={() => setOnlyAtRisk(false)}
                  className="text-xs font-medium px-2.5 py-1.5 rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors self-start sm:self-auto"
                >
                  At-risk only ✕
                </button>
              )}
              <div className="relative w-full sm:w-auto">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="w-full sm:w-64 xl:w-52 pl-8 pr-3 py-2 sm:py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-brand"
                />
              </div>
            </div>
          )
        }
      />

      <div className="p-3 sm:p-4 lg:p-6 xl:p-7">
        {accessError && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600">
            {accessError}
          </div>
        )}

        {loading && <TableSkeleton />}
        {error && <ErrorState message={error} onRetry={refetch} />}

        {!loading && !error && (
          <>
            {/* Mobile + tablet: readable cards instead of a squeezed 10-column table. */}
            <div className="xl:hidden space-y-3">
              {filtered.length === 0 ? (
                <Card padding className="text-center text-sm text-gray-400">
                  {query ? 'No clients match your search.' : onlyAtRisk ? 'No at-risk clients right now.' : 'No clients found.'}
                </Card>
              ) : filtered.map((client: any) => (
                <Card key={client.id} className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="min-w-0">
                      <Link
                        href={`/clients/${client.id}`}
                        className="block text-sm sm:text-base font-semibold text-gray-900 hover:text-brand hover:underline break-words"
                      >
                        {client.name}
                      </Link>
                      {client.clinic && <p className="mt-0.5 text-xs text-gray-400 break-words">{client.clinic}</p>}
                    </div>
                    {canManageAccess && <div className="shrink-0">{renderStatus(client)}</div>}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs">
                    <div className="flex items-start gap-2 min-w-0">
                      <Mail size={14} className="mt-0.5 shrink-0 text-gray-400" />
                      <div className="min-w-0">
                        <p className="text-gray-400 uppercase tracking-wide text-[10px]">Email</p>
                        <p className="text-gray-700 break-all">{client.email || '—'}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 min-w-0">
                      <Phone size={14} className="mt-0.5 shrink-0 text-gray-400" />
                      <div className="min-w-0">
                        <p className="text-gray-400 uppercase tracking-wide text-[10px]">Phone</p>
                        <p className="text-gray-700 break-words">{client.phone || '—'}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 min-w-0">
                      <MapPin size={14} className="mt-0.5 shrink-0 text-gray-400" />
                      <div className="min-w-0">
                        <p className="text-gray-400 uppercase tracking-wide text-[10px]">Country</p>
                        <p className="text-gray-700 break-words">{client.country || '—'}</p>
                      </div>
                    </div>

                    {!isRep && (
                      <div className="flex items-start gap-2 min-w-0">
                        <UserRound size={14} className="mt-0.5 shrink-0 text-gray-400" />
                        <div className="min-w-0">
                          <p className="text-gray-400 uppercase tracking-wide text-[10px]">Assigned rep</p>
                          <p className="text-gray-700 break-words">{client.assigned_rep || '—'}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-gray-100">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-gray-400">Last order</p>
                      <p className="mt-1 text-xs font-medium text-gray-700 break-words">{client.last_order || 'Never'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-gray-400">Days since</p>
                      <div className="mt-1">
                        {client.days_since != null ? (
                          <Badge variant={client.days_since >= 60 ? 'red' : client.days_since >= 30 ? 'amber' : 'teal'}>
                            {client.days_since}d ago
                          </Badge>
                        ) : <span className="text-gray-400 text-xs">—</span>}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-gray-400">Orders</p>
                      <p className="mt-1 text-xs font-medium text-gray-700">{client.total_orders}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100">
                    {renderActions(client, true)}
                  </div>
                </Card>
              ))}
            </div>

            {/* Desktop/laptop: full data table with safe horizontal scrolling on narrower laptops. */}
            <Card className="hidden xl:block">
              <div className="overflow-x-auto overscroll-x-contain">
                <table className="w-full min-w-[1180px] text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Provider</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Email</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Phone</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Country</th>
                      {!isRep && <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Assigned rep</th>}
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Last order</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Days since</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Total orders</th>
                      {canManageAccess && <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Access</th>}
                      <th className="px-4 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-8 text-center text-sm text-gray-400">
                          {query ? 'No clients match your search.' : onlyAtRisk ? 'No at-risk clients right now.' : 'No clients found.'}
                        </td>
                      </tr>
                    ) : filtered.map((client: any) => (
                      <tr key={client.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 max-w-[190px]">
                          <Link href={`/clients/${client.id}`} className="font-medium text-gray-900 hover:text-brand hover:underline break-words">
                            {client.name}
                          </Link>
                          <p className="text-xs text-gray-400 break-words">{client.clinic}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs max-w-[220px] break-all">{client.email || '—'}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{client.phone || '—'}</td>
                        <td className="px-4 py-3 text-gray-600 max-w-[130px] break-words">{client.country}</td>
                        {!isRep && (
                          <td className="px-4 py-3 max-w-[150px]">
                            <p className="text-gray-700 break-words">{client.assigned_rep || '—'}</p>
                          </td>
                        )}
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{client.last_order || 'Never'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {client.days_since != null ? (
                            <Badge variant={client.days_since >= 60 ? 'red' : client.days_since >= 30 ? 'amber' : 'teal'}>
                              {client.days_since}d ago
                            </Badge>
                          ) : <span className="text-gray-400 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{client.total_orders}</td>
                        {canManageAccess && <td className="px-4 py-3 whitespace-nowrap">{renderStatus(client)}</td>}
                        <td className="px-4 py-3 whitespace-nowrap">{renderActions(client)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>
    </>
  )
}
