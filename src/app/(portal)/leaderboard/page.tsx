'use client'
// File: src/app/leaderboard/page.tsx

import { useAuth } from '@/lib/auth-context'
import { useUI } from '@/lib/ui-context'
import { usePortal } from '@/hooks/usePortal'
import { money, repStats } from '@/lib/portal-model'
import { ChevronRight } from '@/components/ui/Icons'

const MEDALS = ['🥇', '🥈', '🥉']

export default function LeaderboardPage() {
  const { providers, reps, repNames, loading } = usePortal()
  const { openDrawer } = useUI()
  const { user } = useAuth()

  // A plain rep can reach this page but /reps 403s for them, so the row
  // list falls back to the rep names attached to their own providers.
  // Ranking across the whole team needs the manager/admin endpoint —
  // said plainly rather than showing a one-row leaderboard as if it were
  // the whole team.
  const canSeeEveryone = user?.role !== 'sales_rep'

  const rows = repNames
    .map(name => repStats(providers, name, reps))
    .sort((a, b) => b.rev - a.rev)

  const max = Math.max(...rows.map(r => r.rev), 1)

  return (
    <>
      <div className="panel">
        <div className="panel-h">
          <h3>Revenue by rep · this month</h3>
          <span className="c">{rows.length}</span>
        </div>

        {loading ? (
          <div className="empty">Loading the leaderboard…</div>
        ) : rows.length ? rows.map((x, i) => (
          <button
            key={x.r}
            className="li"
            onClick={() => { if (x.id) openDrawer({ kind: 'r', id: x.id }) }}
          >
            <span style={{ fontSize: 20, width: 28, textAlign: 'center', flex: '0 0 auto' }}>
              {MEDALS[i] || i + 1}
            </span>
            <span className="grow">
              <span className="t">{x.r}</span>
              <span className="s">
                {x.ord} order{x.ord === 1 ? '' : 's'} · {x.act} account{x.act === 1 ? '' : 's'} activated · {x.rate}% rate
              </span>
            </span>
            <span className="bars">
              <small className="mono" style={{ fontWeight: 700, color: 'var(--ink)' }}>{money(x.rev)}</small>
              <span className="barwrap"><i style={{ width: `${Math.round(x.rev / max * 100)}%` }} /></span>
            </span>
            {x.id ? <ChevronRight /> : <span style={{ width: 17 }} />}
          </button>
        )) : (
          <div className="empty"><b>Nothing to rank yet</b>No revenue has been attributed this month.</div>
        )}
      </div>

      <p className="sub" style={{ marginTop: 12 }}>
        {canSeeEveryone
          ? 'The leaderboard sums lifetime revenue from the accounts assigned to each rep.'
          : 'You are seeing only the reps attached to your own accounts. Full team ranking is visible to managers and administrators.'}
      </p>
    </>
  )
}
