'use client'

// File: src/app/clients/page.tsx

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useClients } from '@/hooks/useData'
import { Topbar } from '@/components/layout/Topbar'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { TableSkeleton, ErrorState } from '@/components/ui/Skeleton'
import { Search, Link2 } from 'lucide-react'
import Link from 'next/link'

export default function ClientsPage() {
  const { isRep } = useAuth()
  const { data: clients, loading, error, refetch } = useClients()
  const [query, setQuery] = useState('')

  const filtered = (clients || []).filter((c: any) =>
    c.name?.toLowerCase().includes(query.toLowerCase()) ||
    c.clinic?.toLowerCase().includes(query.toLowerCase()) ||
    c.country?.toLowerCase().includes(query.toLowerCase())
  )

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
          )
        }
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
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Provider</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Country</th>
                    {!isRep && <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Assigned rep</th>}
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Last order</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Days since</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Total orders</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">
                        {query ? 'No clients match your search.' : 'No clients found.'}
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
                      <td className="px-4 py-3">
                        <Badge variant={client.at_risk ? 'amber' : 'teal'}>
                          {client.at_risk ? 'At risk' : 'Active'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/clients/${client.id}`}>
                          <Button size="sm">View</Button>
                        </Link>
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
