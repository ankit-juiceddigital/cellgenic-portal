'use client'
// File: src/app/approvals/page.tsx

import { useState } from 'react'
import { usePendingProviders, useProviderActions } from '@/hooks/useData'
import { Topbar } from '@/components/layout/Topbar'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { TableSkeleton, ErrorState } from '@/components/ui/Skeleton'
import { CheckCircle, XCircle, Mail } from 'lucide-react'

export default function ApprovalsPage() {
  const { data: providers, loading, error, refetch } = usePendingProviders()
  const { approve, reject, processing } = useProviderActions()
  const [actioned, setActioned] = useState<Record<number, 'approved' | 'rejected'>>({})

  const pending = (providers || []).filter((p: any) => !actioned[p.id])

  return (
    <>
      <Topbar
        title="Provider Approvals"
        subtitle="Review and approve pending provider applications"
        actions={<span className="text-xs text-gray-400">{pending.length} pending review</span>}
      />
      <div className="p-7">
        {loading && <TableSkeleton rows={3} />}
        {error && <ErrorState message={error} onRetry={refetch} />}
        {!loading && !error && (
          <>
            {pending.length === 0 ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                <CheckCircle size={24} className="text-green-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-green-700">All caught up — no pending approvals.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pending.map((p: any) => (
                  <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{p.clinic} · {p.country}</p>
                      </div>
                      <Badge variant="blue">Pending review</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">Email</p>
                        <p className="text-sm text-gray-700">{p.email}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">License number</p>
                        <p className="text-sm font-mono text-gray-700">{p.license || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">Specialty</p>
                        <p className="text-sm text-gray-700">{p.specialty || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">Submitted</p>
                        <p className="text-sm text-gray-700">{p.submitted || '—'}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-3 border-t border-gray-50">
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={processing === p.id}
                        onClick={() => approve(p.id, () => setActioned(prev => ({ ...prev, [p.id]: 'approved' })))}
                      >
                        <CheckCircle size={13} />
                        {processing === p.id ? 'Processing...' : 'Approve provider'}
                      </Button>
                      <Button
                        size="sm"
                        className="border-red-200 text-red-600 hover:bg-red-50"
                        disabled={processing === p.id}
                        onClick={() => reject(p.id, () => setActioned(prev => ({ ...prev, [p.id]: 'rejected' })))}
                      >
                        <XCircle size={13} /> Reject
                      </Button>
                      <Button size="sm" className="ml-auto">
                        <Mail size={13} /> Request more info
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
