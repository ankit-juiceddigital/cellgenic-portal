'use client'
// File: src/app/approvals/page.tsx

import { useState } from 'react'
import { usePendingProviders, useProviderActions } from '@/hooks/useData'
import { Topbar } from '@/components/layout/Topbar'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { TableSkeleton, ErrorState } from '@/components/ui/Skeleton'
import { CheckCircle, XCircle, Mail, FileText, ExternalLink, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm text-gray-700">{value || '—'}</p>
    </div>
  )
}

export default function ApprovalsPage() {
  const router = useRouter()
  const { data: providers, loading, error, refetch } = usePendingProviders()
  const { approve, reject, processing } = useProviderActions()
  const [actioned, setActioned] = useState<Record<number, 'approved' | 'rejected'>>({})
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})

  const pending = (providers || []).filter((p: any) => !actioned[p.id])

  return (
    <>
      <Topbar
        title="Provider Approvals"
        subtitle="Newest applications first — review and approve pending providers"
        actions={<span className="text-xs text-gray-400">{pending.length} pending review</span>}
      />
      <div className="p-7">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-5 transition-colors"
        >
          <ArrowLeft size={15} /> Back
        </button>
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
                  <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-5">

                    {/* Header row */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{p.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {p.has_document && (
                          <Badge variant="teal">
                            <FileText size={10} className="mr-1" /> Doc uploaded
                          </Badge>
                        )}
                        <Badge variant="blue">Pending review</Badge>
                      </div>
                    </div>
                    {/* Date submitted — prominent */}
                    <div className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5 mb-4">
                      <span className="text-xs text-gray-400">Submitted</span>
                      <span className="text-xs font-semibold text-gray-700">{p.submitted}</span>
                    </div>

                    {/* Primary fields — always visible */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <Field label="Phone" value={p.phone} />
                      <Field label="Provider role" value={p.role} />
                      <Field label="Years of experience" value={p.years} />
                      <Field label="Country" value={p.country} />
                      <Field label="City" value={p.city} />
                    </div>

                    {/* Secondary fields — toggle */}
                    {expanded[p.id] && (
                      <div className="border-t border-gray-50 pt-4 mb-4 space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                          <Field label="Monthly patient volume" value={p.volume} />
                          <Field label="Practice setup" value={p.setup} />
                          <Field label="Investment level" value={p.investment} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <Field label="Treatment pillars" value={p.pillars} />
                          <Field label="Referred by (rep code)" value={p.referal_linkcode} />
                        </div>
                        {p.message && (
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Message / Notes</p>
                            <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2 leading-relaxed">{p.message}</p>
                          </div>
                        )}
                        {p.verification_doc && (
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Verification document</p>
                            <a
                              href={p.verification_doc}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-sm text-brand font-medium hover:underline"
                            >
                              <FileText size={14} />
                              View uploaded document
                              <ExternalLink size={12} />
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Toggle more/less */}
                    <button
                      onClick={() => setExpanded(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                      className="text-xs text-gray-400 hover:text-gray-600 mb-4 block"
                    >
                      {expanded[p.id] ? '▲ Show less' : '▼ Show full application'}
                    </button>

                    {/* Action buttons */}
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
