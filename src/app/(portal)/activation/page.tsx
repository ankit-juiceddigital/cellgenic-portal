'use client'
// File: src/app/activation/page.tsx
//
// The main working surface: every account inside (or just out of) its
// 30-day window, grouped by urgency, with a kanban alternative.

import { useEffect } from 'react'
import { useFilters } from '@/lib/filter-context'
import { usePortal } from '@/hooks/usePortal'
import { isAwaitingAdminReview, PIPE_COLUMNS, WINDOW_DAYS } from '@/lib/portal-model'
import { FilterBar, useProviderFilter } from '@/components/ui/FilterBar'
import { GroupedProviderTable, PipelineView } from '@/components/ui/ProviderTable'
import { ChevronDown } from '@/components/ui/Icons'

const RULES: [string, string, string][] = [
  ['Day 0', 'Access is granted.', 'The account enters the pipeline as “Not contacted” and the clock starts.'],
  ['Day 1', 'Welcome call.', 'If it is not logged within 48 h, the account jumps to the rep’s urgent queue.'],
  ['Day 3', 'Guide email', 'with the catalogue and, once verified, pricing.'],
  ['Day 10', 'Quote sent.', 'With no reply it moves to “No response” and a second call is scheduled.'],
  ['Day 25', 'Closing notice', 'to the client and the rep. It shows up in the red alert.'],
  ['Day 30', 'With no first order the account is deactivated', 'and moves to reactivation.'],
]

export default function ActivationPage() {
  const { providers, loading, error, refetch } = usePortal()
  const { view, collapsed, toggleCollapse, dense } = useFilters()
  const match = useProviderFilter()

  // The compact-rows toggle is a body class in the design's CSS. Done in
  // an effect, not during render — mutating the DOM in a render body
  // breaks under React's strict/concurrent double-invoke.
  useEffect(() => {
    document.body.classList.toggle('dense', dense)
    return () => { document.body.classList.remove('dense') }
  }, [dense])

  if (error) {
    return (
      <div className="panel">
        <div className="empty">
          <b>Could not load accounts</b>{error}
          <div style={{ marginTop: 14 }}>
            <button className="btn btn-sm" onClick={() => refetch()}>Try again</button>
          </div>
        </div>
      </div>
    )
  }

  // Pending applications belong in Approvals. The activation clock starts
  // only after access is actually granted.
  const rows = providers.filter(x => !isAwaitingAdminReview(x.accountStatus) && x.accountStatus !== 'rejected').filter(match)
  const whyClosed = collapsed.has('why')

  return (
    <>
      <FilterBar withView />

      {loading ? (
        <div className="panel"><div className="empty">Loading accounts…</div></div>
      ) : view === 'pipe' ? (
        <PipelineView rows={rows} columns={PIPE_COLUMNS} />
      ) : (
        <GroupedProviderTable rows={rows} />
      )}

      <div className="why">
        <button
          className={`why-h ${whyClosed ? 'closed' : ''}`}
          aria-expanded={!whyClosed}
          onClick={() => toggleCollapse('why')}
        >
          <ChevronDown className={whyClosed ? 'chev closed' : 'chev'} />
          <h2>The {WINDOW_DAYS}-day rule</h2>
          <span className="gsub">{RULES.length} steps</span>
        </button>
        {!whyClosed && (
          <div className="why-b">
            <ul className="rules">
              {RULES.map(([day, bold, rest]) => (
                <li key={day}>
                  <span className="d">{day}</span>
                  <span><b>{bold}</b> {rest}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  )
}
