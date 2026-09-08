'use client'
// File: src/app/dashboard/page.tsx — "Overview"

import Link from 'next/link'
import { useFilters } from '@/lib/filter-context'
import { useUI } from '@/lib/ui-context'
import { usePortal } from '@/hooks/usePortal'
import {
  activationRate, billedThisMonth, counts, money, sortProviders,
} from '@/lib/portal-model'
import { FlatProviderTable } from '@/components/ui/ProviderTable'

function Stat({
  cls, value, unit, label, onClick,
}: {
  cls?: string; value: string; unit?: string; label: string; onClick: () => void
}) {
  return (
    <button className={`stat ${cls || ''}`} onClick={onClick}>
      <span className="v mono">{value}{unit && <small>{unit}</small>}</span>
      <span className="l">{label}</span>
      <span className="go">View →</span>
    </button>
  )
}

export default function OverviewPage() {
  const { providers, orders, approvals, loading, error, refetch } = usePortal()
  const { goWithAlert, sortKey, sortDir } = useFilters()
  const { toast } = useUI()

  if (loading) {
    return (
      <div className="stats">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="stat" style={{ opacity: .5 }}>
            <span className="v mono">—</span>
            <span className="l">Loading…</span>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="panel">
        <div className="empty">
          <b>Could not load the portal</b>
          {error}
          <div style={{ marginTop: 14 }}>
            <button className="btn btn-sm" onClick={() => refetch()}>Try again</button>
          </div>
        </div>
      </div>
    )
  }

  const c = counts(providers, orders, approvals)
  const rate = activationRate(providers)
  const billed = billedThisMonth(orders)

  // "Your day" = everything urgent, plus anything closing soon that has
  // nobody working it. Same rule as the design.
  const day = sortProviders(
    providers.filter(x => x.bucket === 'urg' || (x.bucket === 'warn' && !x.rep)),
    sortKey, sortDir,
  )

  return (
    <>
      {c.urg > 0 && (
        <div className="alarm-bar">
          <span className="big mono">{c.urg}</span>
          <p>
            <b>account{c.urg > 1 ? 's' : ''} close in 5 days or less.</b><br />
            With no first order they are deactivated on day 30.
          </p>
          <span className="acts">
            <button className="btn btn-sm" onClick={() => goWithAlert('/activation', 'urg')}>
              View accounts
            </button>
            <button
              className="btn btn-sm btn-clay"
              onClick={() => toast('Rep notification emails are not wired up yet.')}
            >Notify reps</button>
          </span>
        </div>
      )}

      <div className="stats">
        <Stat cls="alarm" value={String(c.urg)} label="Closing in ≤5 days"
              onClick={() => goWithAlert('/activation', 'urg')} />
        <Stat value={String(c.win)} label="In activation window"
              onClick={() => goWithAlert('/activation')} />
        <Stat value={String(c.norep)} label="No rep assigned"
              onClick={() => goWithAlert('/activation', 'norep')} />
        <Stat cls="good" value={String(rate)} unit="%" label="30-day activation rate"
              onClick={() => goWithAlert('/clients')} />
        <Stat value={money(billed)} label="Billed this month"
              onClick={() => goWithAlert('/orders')} />
        <Stat value={String(c.apr)} label="Requests to approve"
              onClick={() => goWithAlert('/approvals')} />
      </div>

      <div className="panel">
        <div className="panel-h">
          <h3>Your day</h3>
          <span className="c">{day.length}</span>
          <span className="r">
            <Link href="/activation" className="btn btn-sm">View activation</Link>
          </span>
        </div>
        <FlatProviderTable rows={day} urgent={day.length > 0} />
      </div>
    </>
  )
}
