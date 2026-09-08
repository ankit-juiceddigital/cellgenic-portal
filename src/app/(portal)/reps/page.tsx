'use client'
// File: src/app/reps/page.tsx

import { useFilters } from '@/lib/filter-context'
import { useUI } from '@/lib/ui-context'
import { usePortal } from '@/hooks/usePortal'
import { initials, money, repStats } from '@/lib/portal-model'
import { ChevronRight, LockIcon } from '@/components/ui/Icons'

export default function RepsPage() {
  const { providers, reps, loading, error, refetch } = usePortal()
  const { openDrawer } = useUI()
  const { goWithAlert } = useFilters()

  if (error) {
    return (
      <div className="panel">
        <div className="empty">
          <b>Could not load the team</b>{error}
          <div style={{ marginTop: 14 }}>
            <button className="btn btn-sm" onClick={() => refetch()}>Try again</button>
          </div>
        </div>
      </div>
    )
  }

  const unassigned = providers.filter(x => !x.rep && x.orders === 0).length
  // Only accounts that can actually own clients appear here.
  const owners = reps.filter(r => r.repCode)

  return (
    <>
      <div className="lockbar">
        <LockIcon />
        <div>
          <b>The client list cannot be downloaded</b>
          <p>
            There is no export, no CSV and no bulk copy — not for reps, not for administrators.
            Phone numbers and emails stay hidden until someone taps Show, and every reveal is
            written to an audit log with a name, a timestamp and an IP. Each screen carries the
            viewer&rsquo;s name.
          </p>
        </div>
      </div>

      {unassigned > 0 && (
        <div className="alarm-bar">
          <span className="big mono">{unassigned}</span>
          <p>
            <b>account{unassigned > 1 ? 's' : ''} have no rep.</b><br />
            Nobody is working them during their 30-day window.
          </p>
          <span className="acts">
            <button className="btn btn-sm btn-clay" onClick={() => goWithAlert('/activation', 'norep')}>
              Distribute them
            </button>
          </span>
        </div>
      )}

      <div className="panel">
        <div className="panel-h">
          <h3>Team</h3>
          <span className="c">{owners.length}</span>
        </div>

        {loading ? (
          <div className="empty">Loading the team…</div>
        ) : owners.length ? owners.map(r => {
          const x = repStats(providers, r.name, reps)
          return (
            <button key={r.id} className="li" onClick={() => openDrawer({ kind: 'r', id: r.id })}>
              <span className="av">{initials(r.name)}</span>
              <span className="grow">
                <span className="t">
                  {r.name}
                  {r.role !== 'sales_rep' && (
                    <span className="tag">{r.role === 'administrator' ? 'Admin' : 'Manager'}</span>
                  )}
                </span>
                <span className="s">
                  {x.total} account{x.total === 1 ? '' : 's'} · {x.act} activated
                  {x.urg ? <> · <b style={{ color: 'var(--clay)' }}>{x.urg} urgent</b></> : null}
                  {' · '}{money(x.rev)}
                </span>
              </span>
              <span className="bars">
                <small>Activation rate <b className="mono">{x.rate}%</b></small>
                <span className="barwrap"><i style={{ width: `${x.rate}%` }} /></span>
              </span>
              <ChevronRight />
            </button>
          )
        }) : (
          <div className="empty">
            <b>No rep accounts with a code</b>
            A staff account needs a rep code before clients can be assigned to it.
          </div>
        )}

        <button className="li" onClick={() => goWithAlert('/activation', 'norep')}>
          <span className="ini">—</span>
          <span className="grow">
            <span className="t">Unassigned</span>
            <span className="s">{unassigned} account{unassigned === 1 ? '' : 's'} waiting for an owner</span>
          </span>
          <ChevronRight />
        </button>
      </div>
    </>
  )
}
