'use client'
// File: src/app/(portal)/approvals/page.tsx
//
// Keeps the old portal's compact approvals-card layout while using the
// current portal's data/actions and approval detail drawer.

import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useUI } from '@/lib/ui-context'
import { usePortal } from '@/hooks/usePortal'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, CheckCircle, FileText, Info, XCircle } from 'lucide-react'

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

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="min-w-0">
      <p className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <p className="break-words text-sm leading-5 text-gray-700">{value || '—'}</p>
    </div>
  )
}

function makeInvestmentTier(label: InvestmentTier['label']): InvestmentTier {
  return { label, ...investmentTiers[label] }
}

function normalizeInvestmentValue(value: string) {
  return value.trim().toLowerCase().replace(/[–—−]/g, '-').replace(/\s+/g, '')
}

function getInvestmentTier(value?: string | null): InvestmentTier | null {
  if (!value) return null
  const normalized = normalizeInvestmentValue(value)

  if (/\$?15k\+\/?month/.test(normalized)) return makeInvestmentTier('Priority Lead')
  if (/\$?5k-\$?15k\/?month/.test(normalized)) return makeInvestmentTier('High Potential')
  if (/\$?2k-\$?5k\/?month/.test(normalized)) return makeInvestmentTier('Growth Opportunity')
  if (/\$?0-\$?2k\/?month/.test(normalized)) return makeInvestmentTier('Standard Lead')

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
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-2 text-[11px] font-semibold shadow-sm ${tier.className}`}
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

function formatSubmitted(date: Date) {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export default function ApprovalsPage() {
  const router = useRouter()
  const { approvals, loading, error, refetch, approve, reject, busy } = usePortal()
  const { openDrawer, toast } = useUI()
  const { user } = useAuth()
  const isRep = user?.role === 'sales_rep'

  const openApproval = (id: number) => openDrawer({ kind: 'a', id })

  return (
    <div className="pt-7">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <button
          onClick={() => router.back()}
          className="flex w-fit items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-gray-700"
        >
          <ArrowLeft size={15} /> Back
        </button>
        <InvestmentLegend />
      </div>

      {loading && (
        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-[500px] animate-pulse rounded-2xl border border-gray-200 bg-white" />
          ))}
        </div>
      )}

      {error && !loading && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm font-medium text-red-700">Could not load requests</p>
          <p className="mt-1 text-sm text-red-600">{error}</p>
          <Button className="mt-4" size="sm" onClick={() => refetch()}>Try again</Button>
        </div>
      )}

      {!loading && !error && approvals.length === 0 && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
          <CheckCircle size={24} className="mx-auto mb-2 text-green-500" />
          <p className="text-sm font-medium text-green-700">
            {isRep ? 'No requests from your referral link are waiting.' : 'All caught up — no pending approvals.'}
          </p>
        </div>
      )}

      {!loading && !error && approvals.length > 0 && (
        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
          {approvals.map(a => (
            <article
              key={a.id}
              role="button"
              tabIndex={0}
              aria-label={`Open approval details for ${a.n}`}
              onClick={() => openApproval(a.id)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  openApproval(a.id)
                }
              }}
              className="flex min-w-0 cursor-pointer flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2"
            >
              <div className="p-4 sm:p-5">
                <div className="mb-3 flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-base font-semibold leading-5 text-gray-900">{a.n}</p>
                    <p className="mt-1 break-all text-xs leading-4 text-gray-400">{a.e}</p>
                  </div>
                  <Badge variant="blue">Pending</Badge>
                </div>

                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <InvestmentBadge value={a.investment} />
                  {a.hasDocument && (
                    <Badge variant="teal">
                      <FileText size={10} className="mr-1" /> Doc uploaded
                    </Badge>
                  )}
                </div>

                <div className="mb-2 inline-flex max-w-full flex-wrap items-center gap-1.5 rounded-lg border border-gray-100 bg-gray-50 px-3 py-1.5">
                  <span className="text-xs text-gray-400">Submitted</span>
                  <span className="text-xs font-semibold text-gray-700">{formatSubmitted(a.req)}</span>
                </div>

                <div className="grid grid-cols-2">
                  <Field label="Phone" value={a.p} />
                  <Field label="Provider role" value={a.providerRole} />
                  <Field label="Country" value={a.c} />
                  <Field label="Experience" value={a.years} />
                  <Field label="State" value={a.state} />
                  <Field label="City" value={a.city} />
                </div>

                <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-2">
                  <Field label="Investment level" value={a.investment} />
                </div>

                <button
                  type="button"
                  className="mt-4 block text-xs font-medium text-gray-400 hover:text-gray-600"
                  onClick={e => {
                    e.stopPropagation()
                    openApproval(a.id)
                  }}
                >
                  ▼ Show full application
                </button>
              </div>

              <div
                className="mt-auto border-t border-gray-100 bg-gray-50/40 p-3 sm:p-4"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    className="flex-1 justify-center whitespace-nowrap py-2"
                    disabled={busy === a.id}
                    onClick={async () => {
                      try {
                        await approve(a.id)
                        toast(`${a.n} now has access. Their 30-day window starts today.`)
                      } catch (e: any) {
                        toast(e?.message || 'Could not approve this request.')
                      }
                    }}
                  >
                    <CheckCircle size={13} />
                    {busy === a.id ? 'Processing...' : 'Approve'}
                  </Button>

                  <Button
                    size="sm"
                    className="flex-1 justify-center whitespace-nowrap border-red-200 text-red-600 hover:bg-red-50"
                    disabled={busy === a.id}
                    onClick={async () => {
                      try {
                        await reject(a.id)
                        toast(`${a.n}'s request rejected.`)
                      } catch (e: any) {
                        toast(e?.message || 'Could not reject this request.')
                      }
                    }}
                  >
                    <XCircle size={13} /> Reject
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
