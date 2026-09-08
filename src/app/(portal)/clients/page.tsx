'use client'
// File: src/app/clients/page.tsx — "Active clients"
//
// Accounts that have ordered at least once. Uses the design's .li list
// row rather than the .tr grid — the window countdown is meaningless
// here, so the right-hand column becomes a "days since last order" bar.

import { useFilters } from '@/lib/filter-context'
import { useUI } from '@/lib/ui-context'
import { usePortal } from '@/hooks/usePortal'
import { dayDiff, flag, initials, money, today } from '@/lib/portal-model'
import { FilterBar, useProviderFilter } from '@/components/ui/FilterBar'
import { ChevronRight } from '@/components/ui/Icons'

/** Past this many days without an order, the bar turns amber. */
const STALE_DAYS = 90

export default function ActiveClientsPage() {
  const { providers, loading, error, refetch } = usePortal()
  const { openDrawer } = useUI()
  const match = useProviderFilter()

  if (error) {
    return (
      <div className="panel">
        <div className="empty">
          <b>Could not load clients</b>{error}
          <div style={{ marginTop: 14 }}>
            <button className="btn btn-sm" onClick={() => refetch()}>Try again</button>
          </div>
        </div>
      </div>
    )
  }

  const rows = providers
    .filter(x => x.orders > 0 && match(x))
    .sort((a, b) => (b.last?.getTime() || 0) - (a.last?.getTime() || 0))

  const totalRev = rows.reduce((a, b) => a + b.rev, 0)

  return (
    <>
      <FilterBar />

      <div className="panel">
        <div className="panel-h">
          <h3>Clients with at least one order</h3>
          <span className="c">{rows.length}</span>
          <span className="r">
            <span className="gsub mono">{money(totalRev)} lifetime</span>
          </span>
        </div>

        {loading ? (
          <div className="empty">Loading clients…</div>
        ) : rows.length ? rows.map(x => {
          const dd = x.last ? dayDiff(x.last, today()) : null
          const stale = dd !== null && dd > STALE_DAYS
          // Bar shrinks as the gap grows, floored at 4% so it never
          // vanishes entirely.
          const width = dd === null ? 4 : Math.max(4, 100 - Math.min(dd, 180) / 1.8)
          return (
            <button key={x.id} className="li" onClick={() => openDrawer({ kind: 'p', id: x.id })}>
              <span className={`ini ${x.vip ? 'vip' : ''}`}>{initials(x.n)}</span>
              <span className="grow">
                <span className="t">
                  {x.n}
                  {x.tag && <span className="tag">{x.tag}</span>}
                  {x.vip && <span className="tag">VIP</span>}
                </span>
                <span className="s">
                  {flag(x.cc)} {x.c} · {x.orders} order{x.orders > 1 ? 's' : ''} · {money(x.rev)} · {x.rep || 'no rep'}
                </span>
              </span>
              <span className="bars">
                <small style={{ color: stale ? 'var(--amber)' : 'var(--muted)' }}>
                  {dd === null
                    ? 'No order date'
                    : <>Last order <b className="mono">{dd} d</b> ago</>}
                </small>
                <span className="barwrap">
                  <i style={{ width: `${width}%`, background: stale ? 'var(--amber)' : 'var(--jade)' }} />
                </span>
              </span>
              <ChevronRight />
            </button>
          )
        }) : (
          <div className="empty"><b>No results</b>No active clients match these filters.</div>
        )}
      </div>
    </>
  )
}
