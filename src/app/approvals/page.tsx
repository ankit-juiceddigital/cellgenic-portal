'use client'
// File: src/app/approvals/page.tsx

import { useState } from 'react'
import { usePendingProviders, useProviderActions, useReps } from '@/hooks/useData'
import { useAuth } from '@/lib/auth-context'
import { Topbar } from '@/components/layout/Topbar'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { TableSkeleton, ErrorState } from '@/components/ui/Skeleton'
import { CheckCircle, XCircle, Mail, FileText, ExternalLink, ArrowLeft, Info } from 'lucide-react'
import { useRouter } from 'next/navigation'

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="min-w-0">
      <p className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <p className="break-words text-sm leading-5 text-gray-700">{value || '—'}</p>
    </div>
  )
}

type InvestmentTier = {
  label: 'Priority Lead' | 'High Potential' | 'Growth Opportunity' | 'Standard Lead'
  className: string
  dotClassName: string
  range: string
}

const investmentTiers: Record<InvestmentTier['label'], Omit<InvestmentTier, 'label'>> = {
  'Priority Lead': {
    className: 'border-purple-200 bg-purple-50 text-purple-700 ring-1 ring-purple-100',
    dotClassName: 'bg-purple-500',
    range: '$15k+ / month',
  },
  'High Potential': {
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
    dotClassName: 'bg-emerald-500',
    range: '$5k–$15k / month',
  },
  'Growth Opportunity': {
    className: 'border-blue-200 bg-blue-50 text-blue-700 ring-1 ring-blue-100',
    dotClassName: 'bg-blue-500',
    range: '$2k–$5k / month',
  },
  'Standard Lead': {
    className: 'border-slate-200 bg-slate-50 text-slate-700 ring-1 ring-slate-100',
    dotClassName: 'bg-slate-500',
    range: '$0–$2k / month',
  },
}

function makeInvestmentTier(label: InvestmentTier['label']): InvestmentTier {
  return { label, ...investmentTiers[label] }
}

function normalizeInvestmentValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[–—−]/g, '-')
    .replace(/\s+/g, '')
}

function getInvestmentTier(value?: string | null): InvestmentTier | null {
  if (!value) return null

  const normalized = normalizeInvestmentValue(value)

  // Match the four exact registration choices. The replacements above make
  // this tolerant of en-dash/em-dash/hyphen and spacing differences.
  if (/\$?15k\+\/?month/.test(normalized)) {
    return makeInvestmentTier('Priority Lead')
  }
  if (/\$?5k-\$?15k\/?month/.test(normalized)) {
    return makeInvestmentTier('High Potential')
  }
  if (/\$?2k-\$?5k\/?month/.test(normalized)) {
    return makeInvestmentTier('Growth Opportunity')
  }
  if (/\$?0-\$?2k\/?month/.test(normalized)) {
    return makeInvestmentTier('Standard Lead')
  }

  // Safe fallback for legacy/descriptive values that may already exist.
  if (/priority|highest|veryhigh/.test(normalized)) return makeInvestmentTier('Priority Lead')
  if (/highpotential|\bhigh\b/.test(value.toLowerCase())) return makeInvestmentTier('High Potential')
  if (/growth|medium|moderate/.test(value.toLowerCase())) return makeInvestmentTier('Growth Opportunity')

  return makeInvestmentTier('Standard Lead')
}

function InvestmentBadge({ value }: { value?: string | null }) {
  const tier = getInvestmentTier(value)
  if (!tier) return null

  return (
    <span
      title={`${tier.label} — ${tier.range}`}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold shadow-sm ${tier.className}`}
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${tier.dotClassName}`} />
      {tier.label}
    </span>
  )
}

function InvestmentLegend() {
  const items: InvestmentTier['label'][] = [
    'Priority Lead',
    'High Potential',
    'Growth Opportunity',
    'Standard Lead',
  ]

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm">
      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500">
        <Info size={12} /> Lead priority
      </span>
      {items.map(label => {
        const tier = makeInvestmentTier(label)
        return (
          <span key={label} className="inline-flex items-center gap-1.5 text-[11px] text-gray-500" title={`${label}: ${tier.range}`}>
            <span className={`h-2 w-2 rounded-full ${tier.dotClassName}`} />
            <span className="font-medium text-gray-600">{label}</span>
            <span className="text-gray-400">({tier.range})</span>
          </span>
        )
      })}
    </div>
  )
}

export default function ApprovalsPage() {
  const router = useRouter()
  const { isRep } = useAuth()
  const { data: providers, loading, error, refetch } = usePendingProviders()
  const { data: reps } = useReps()
  const { approve, reject, processing } = useProviderActions()
  const [actioned, setActioned] = useState<Record<number, 'approved' | 'rejected'>>({})
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})

  const pending = (providers || []).filter((p: any) => !actioned[p.id])

  return (
    <>
      <Topbar
        title={isRep ? 'My Referral Approvals' : 'Provider Approvals'}
        subtitle={isRep ? 'Providers who signed up under your referral code' : 'Newest applications first — review and approve pending providers'}
        actions={<span className="text-xs text-gray-400">{pending.length} pending review</span>}
      />

      <div className="p-4 md:p-6 xl:p-7">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <button
            onClick={() => router.back()}
            className="flex w-fit items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-gray-700"
          >
            <ArrowLeft size={15} /> Back
          </button>

          <InvestmentLegend />
        </div>

        {loading && <TableSkeleton rows={3} />}
        {error && <ErrorState message={error} onRetry={refetch} />}

        {!loading && !error && (
          <>
            {pending.length === 0 ? (
              <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
                <CheckCircle size={24} className="mx-auto mb-2 text-green-500" />
                <p className="text-sm font-medium text-green-700">All caught up — no pending approvals.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
                {pending.map((p: any) => {
                  const referredBy = p.referal_linkcode
                    ? (() => {
                        const rep = (reps || []).find(
                          (r: any) => r.rep_code && r.rep_code.toLowerCase() === p.referal_linkcode.toLowerCase()
                        )
                        return rep ? rep.name : 'Unknown rep'
                      })()
                    : 'None (unclaimed)'

                  return (
                    <article
                      key={p.id}
                      className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="p-4 sm:p-5">
                        {/* Provider identity and review status */}
                        <div className="mb-3 flex min-w-0 items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="break-words text-base font-semibold leading-5 text-gray-900">{p.name}</p>
                            <p className="mt-1 break-all text-xs leading-4 text-gray-400">{p.email}</p>
                          </div>
                          <Badge variant="blue">Pending</Badge>
                        </div>

                        {/* Investment priority is intentionally prominent. */}
                        <div className="mb-4 flex flex-wrap items-center gap-2">
                          <InvestmentBadge value={p.investment} />
                          {p.has_document && (
                            <Badge variant="teal">
                              <FileText size={10} className="mr-1" /> Doc uploaded
                            </Badge>
                          )}
                        </div>

                        <div className="mb-4 inline-flex max-w-full flex-wrap items-center gap-1.5 rounded-lg border border-gray-100 bg-gray-50 px-3 py-1.5">
                          <span className="text-xs text-gray-400">Submitted</span>
                          <span className="text-xs font-semibold text-gray-700">{p.submitted}</span>
                        </div>

                        {/* Core information stays visible without expanding the card. */}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                          <Field label="Phone" value={p.phone} />
                          <Field label="Provider role" value={p.role} />
                          <Field label="Country" value={p.country} />
                          <Field label="Experience" value={p.years} />
                          <Field label="State" value={p.state} />
                          <Field label="City" value={p.city} />
                        </div>

                        {/* Show the actual investment answer as well as the priority badge. */}
                        <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50/70 p-3">
                          <Field label="Investment level" value={p.investment} />
                        </div>

                        {expanded[p.id] && (
                          <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                              <Field label="Monthly patient volume" value={p.volume} />
                              <Field label="Practice setup" value={p.setup} />
                              <Field label="Treatment pillars" value={p.pillars} />
                              <Field label="Referred by" value={referredBy} />
                            </div>

                            {p.message && (
                              <div>
                                <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-gray-400">Message / Notes</p>
                                <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm leading-relaxed text-gray-700">{p.message}</p>
                              </div>
                            )}

                            {p.verification_doc && (
                              <div>
                                <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-gray-400">Verification document</p>
                                <a
                                  href={p.verification_doc}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
                                >
                                  <FileText size={14} />
                                  View uploaded document
                                  <ExternalLink size={12} />
                                </a>
                              </div>
                            )}
                          </div>
                        )}

                        <button
                          onClick={() => setExpanded(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                          className="mt-4 block text-xs font-medium text-gray-400 hover:text-gray-600"
                        >
                          {expanded[p.id] ? '▲ Show less' : '▼ Show full application'}
                        </button>
                      </div>

                      {/* Actions remain at the bottom of every card for predictable scanning. */}
                      <div className="mt-auto border-t border-gray-100 bg-gray-50/40 p-3 sm:p-4">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            className="flex-1 justify-center whitespace-nowrap"
                            disabled={processing === p.id}
                            onClick={() => approve(p.id, () => setActioned(prev => ({ ...prev, [p.id]: 'approved' })))}
                          >
                            <CheckCircle size={13} />
                            {processing === p.id ? 'Processing...' : 'Approve'}
                          </Button>

                          <Button
                            size="sm"
                            className="flex-1 justify-center whitespace-nowrap border-red-200 text-red-600 hover:bg-red-50"
                            disabled={processing === p.id}
                            onClick={() => reject(p.id, () => setActioned(prev => ({ ...prev, [p.id]: 'rejected' })))}
                          >
                            <XCircle size={13} /> Reject
                          </Button>

                          {/*<Button size="sm" className="w-full justify-center sm:w-auto sm:flex-1">
                            <Mail size={13} /> Request info
                          </Button>*/}
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
