'use client'
// File: src/app/reps/page.tsx

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useReps, useRepAccess } from '@/hooks/useData'
import { Topbar } from '@/components/layout/Topbar'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { TableSkeleton, ErrorState } from '@/components/ui/Skeleton'
import { EditRepModal } from '@/components/EditRepModal'
import { Trash2, Shield, Briefcase } from 'lucide-react'
import Link from 'next/link'

function roleBadge(role: string) {
  if (role === 'administrator') return <Badge variant="blue">Administrator</Badge>
  if (role === 'sales_manager') return <Badge variant="amber">Sales Manager</Badge>
  return <Badge variant="green">Sales Rep</Badge>
}

export default function RepsPage() {
  const { isAdmin, user } = useAuth()
  const { data: reps, loading, error, refetch } = useReps()
  const { remove, processing: deleteProcessing, error: deleteError } = useRepAccess()
  const [editingRepId, setEditingRepId] = useState<number | null>(null)
  const [deletedIds, setDeletedIds] = useState<number[]>([])

  const sorted = (reps || [])
    // Whoever is viewing this page doesn't need to see themselves in
    // their own staff directory / leaderboard.
    .filter((r: any) => r.id !== user?.userId)
    .filter((r: any) => !deletedIds.includes(r.id))
    .sort((a: any, b: any) => b.ordersMonth - a.ordersMonth)

  // Medal icons only make sense among actual selling reps — rank is
  // computed within sales_rep rows only, so an admin/manager row with
  // zero orders doesn't accidentally "win" a medal by sort position.
  const salesRepIds = sorted.filter((r: any) => r.role === 'sales_rep').map((r: any) => r.id)

  return (
    <>
      <Topbar
        title={isAdmin ? 'Sales Representatives' : 'Rep Performance'}
        subtitle={isAdmin ? 'All staff accounts — reps, managers, and administrators' : 'Individual rep metrics this month'}
      />
      <div className="p-4 md:p-7">
        {deleteError && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600">
            {deleteError}
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
                    {['Rank', 'Name', 'Role', 'Code', 'Clients', 'Orders (this month)', 'Trend', ...(isAdmin ? [''] : [])].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((rep: any) => {
                    const isRepRole = rep.role === 'sales_rep'
                    const repRank = isRepRole ? salesRepIds.indexOf(rep.id) : -1
                    return (
                      <tr key={rep.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                        <td className="px-4 py-3 text-xl">
                          {isRepRole
                            ? (repRank === 0 ? '🥇' : repRank === 1 ? '🥈' : repRank === 2 ? '🥉' : <span className="text-sm text-gray-300">{repRank + 1}</span>)
                            : rep.role === 'administrator'
                            ? <Shield size={16} className="text-gray-300" />
                            : <Briefcase size={16} className="text-gray-300" />
                          }
                        </td>
                        <td className="px-4 py-3 font-medium">
                          <Link href={`/reps/${rep.id}`} className="text-gray-900 hover:text-brand hover:underline">
                            {rep.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3">{roleBadge(rep.role)}</td>
                        <td className="px-4 py-3">
                          {rep.rep_code ? (
                            <span className="font-mono text-xs bg-gray-50 border border-gray-100 px-2 py-0.5 rounded">{rep.rep_code}</span>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{rep.clients}</td>
                        <td className="px-4 py-3 text-gray-600">{rep.ordersMonth || 0}</td>
                        <td className="px-4 py-3"><Badge variant="green">Active</Badge></td>
                        {isAdmin && (
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Button size="sm" onClick={() => setEditingRepId(rep.id)}>
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                className="border-red-300 text-red-700 hover:bg-red-50"
                                disabled={deleteProcessing === rep.id}
                                onClick={() => {
                                  const typed = window.prompt(
                                    `This permanently deletes ${rep.name}'s account. ${rep.clients > 0 ? `Their ${rep.clients} assigned client(s) will move to Unassigned (not deleted) so they can be reassigned. ` : ''}This cannot be undone.\n\nType the name exactly to confirm:\n"${rep.name}"`
                                  )
                                  if (typed === null) return
                                  if (typed === rep.name) {
                                    remove(rep.id, () => setDeletedIds(prev => [...prev, rep.id]))
                                  } else {
                                    alert('Name did not match — nothing was deleted.')
                                  }
                                }}
                              >
                                <Trash2 size={13} /> {deleteProcessing === rep.id ? 'Deleting...' : 'Delete'}
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                  {sorted.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">No staff accounts found.</td></tr>
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
