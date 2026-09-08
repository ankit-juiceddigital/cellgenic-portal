'use client'
// File: src/components/ui/ProviderTable.tsx
//
// The centrepiece. Column order, class names and the .tr grid are the
// design's — the CSS defines grid-template-columns for .tr at three
// breakpoints plus a grid-template-areas card mode under 880px, so the
// cells MUST keep their c-* classes and stay in this order or the mobile
// layout collapses.
//
//   34px | provider | access | 30-day window | last order | stage | rep | next action | ⋯

import { useFilters } from '@/lib/filter-context'
import { useUI } from '@/lib/ui-context'
import { usePortal } from '@/hooks/usePortal'
import {
  dayDiff, flag, fmt, fmtShort, GROUPS, initials, maskPhone, PER_PAGE,
  sortProviders, STAGE, today, type SortKey,
} from '@/lib/portal-model'
import type { Provider } from '@/types/portal'
import { CheckIcon, ChevronDown } from '@/components/ui/Icons'
import { Ticks } from '@/components/ui/Ticks'
import { RepPickerSheet, RowActionsSheet } from '@/components/ui/Sheet'

// ─────────────────────────────────────────────
// WINDOW CELL
// ─────────────────────────────────────────────
function WindowCell({ x }: { x: Provider }) {
  if (x.orders > 0) {
    return (
      <div className="win">
        <span className="done">✓ Activated</span>
        <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>
          {x.acc && x.last ? `First order on day ${Math.max(1, dayDiff(x.acc, x.last))}` : 'First order recorded'}
        </span>
      </div>
    )
  }
  if (!x.acc) {
    return (
      <div className="win">
        <span className="lbl"><b style={{ color: '#9B9FA5' }}>No date</b> access not recorded</span>
      </div>
    )
  }
  if (x.left <= 0) {
    return (
      <div className="win">
        <Ticks x={x} />
        <span className="lbl"><b style={{ color: '#9B9FA5' }}>Closed</b> {-x.left} d ago</span>
      </div>
    )
  }
  const cl = x.bucket === 'urg' ? 'urg' : x.bucket === 'warn' ? 'warn' : ''
  return (
    <div className="win">
      <Ticks x={x} />
      <span className="lbl">
        <b className={cl}>{x.left} d</b> to close{x.closes ? ` · ${fmtShort(x.closes)}` : ''}
      </span>
    </div>
  )
}

// ─────────────────────────────────────────────
// ROW
// ─────────────────────────────────────────────
export function ProviderRow({ x }: { x: Provider }) {
  const { selected, toggleSelect, setCountry, setStage, setRep } = useFilters()
  const { openDrawer, openSheet, toast } = useUI()
  const { revealed, reveal, advanceStage, repNames, reps, assignRep } = usePortal()

  const st = STAGE[x.stage]
  const shown = revealed.has(x.id)
  const isSel = selected.has(x.id)
  const naClass = x.bucket === 'urg' ? 'na hot' : x.bucket === 'warn' ? 'na mid' : 'na'

  const stop = (e: React.MouseEvent) => { e.stopPropagation() }

  return (
    <div
      className={`tr row ${isSel ? 'sel' : ''}`}
      tabIndex={0}
      onClick={() => openDrawer({ kind: 'p', id: x.id })}
      onKeyDown={e => { if (e.key === 'Enter') openDrawer({ kind: 'p', id: x.id }) }}
    >
      <div className="c-cb">
        <button
          className={`cb ${isSel ? 'on' : ''}`}
          aria-label="Select"
          onClick={e => { stop(e); toggleSelect(x.id) }}
        >
          <CheckIcon />
        </button>
      </div>

      <div className="c-who who">
        <span className={`ini ${x.vip ? 'vip' : ''}`}>{initials(x.n)}</span>
        <span style={{ minWidth: 0 }}>
          <span className="nm">
            {x.n}
            {x.tag && <span className="tag">{x.tag}</span>}
            {x.accountStatus === 'deactivated' && <span className="tag" style={{ background: 'var(--clay-bg)', color: 'var(--clay)' }}>Deactivated</span>}
          </span>
          <span className="meta nosel">
            <button className="mchip" onClick={e => { stop(e); setCountry(x.c); toast(`Filtered by ${x.c}`) }}>
              {flag(x.cc)} {x.c}
            </button>
            {shown ? (
              <>
                <button
                  className="mchip mono"
                  onClick={e => { stop(e); window.open(`https://wa.me/${x.p.replace(/[^\d]/g, '')}`, '_blank', 'noopener') }}
                >{x.p}</button>
                <span className="mchip">{x.e}</span>
              </>
            ) : (
              <>
                <span className="mchip masked">{maskPhone(x.p)}</span>
                <button
                  className="mchip"
                  onClick={async e => {
                    stop(e)
                    await reveal(x.id)
                    toast('Contact shown — the reveal is logged.')
                  }}
                >Show contact</button>
              </>
            )}
          </span>
        </span>
      </div>

      <div className="c-acc dcell">
        <span className="mlb">Access</span>
        <b className="mono">{x.acc ? fmt(x.acc) : '—'}</b>
        <span>{x.acc ? `${x.elapsed} d ago` : 'not recorded'}</span>
      </div>

      <div className="c-win"><WindowCell x={x} /></div>

      <div className="c-last dcell">
        <span className="mlb">Last order</span>
        {x.last
          ? <><b className="mono">{fmt(x.last)}</b><span>{dayDiff(x.last, today())} d ago</span></>
          : <span className="never">Never ordered</span>}
      </div>

      <div className="c-stage">
        <button className={`pill ${st.k}`} onClick={e => { stop(e); setStage(x.stage); toast(`Stage: ${st.t}`) }}>
          {st.t}
        </button>
      </div>

      <div className="c-rep">
        {x.rep
          ? (
            <button className="rep" onClick={e => { stop(e); setRep(x.rep!); toast(`Accounts for ${x.rep}`) }}>
              <span className="rav">{initials(x.rep)}</span>
              {x.rep.split(' ')[0]}
            </button>
          )
          : (
            <button
              className="assign"
              onClick={e => {
                stop(e)
                openSheet(
                  <RepPickerSheet
                    ids={[x.id]}
                    repNames={repNames}
                    reps={reps}
                    onPick={async (code, name) => {
                      await assignRep([x.id], code, name)
                      toast(code ? `Assigned to ${name}.` : 'Assignment removed.')
                    }}
                  />,
                )
              }}
            >+ Assign rep</button>
          )}
      </div>

      <div className="c-next">
        <button
          className={naClass}
          onClick={async e => {
            stop(e)
            const was = st.t
            try {
              await advanceStage(x.id)
              toast(x.stage === 'act' ? `Contact logged with ${x.n}.` : `${x.n}: ${was} → next stage`)
            } catch (err: any) { toast(err.message || 'Could not update the stage.') }
          }}
        >{st.act}</button>
      </div>

      <div className="c-more">
        <button
          className="more"
          aria-label="More actions"
          onClick={e => { stop(e); openSheet(<RowActionsSheet x={x} />) }}
        >⋯</button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// HEADER
// ─────────────────────────────────────────────
export function ProviderThead() {
  const { sortKey, sortDir, sortBy } = useFilters()
  const b = (k: SortKey, label: string, cls?: string) => (
    <button className={`${cls || ''} ${sortKey === k ? 'act' : ''}`} onClick={() => sortBy(k)}>
      {label}<span className="ar">{sortDir > 0 ? '▲' : '▼'}</span>
    </button>
  )
  return (
    <div className="tr thead">
      <div />
      {b('n', 'Provider')}
      {b('acc', 'Access granted', 'col-acc')}
      {b('left', '30-day window')}
      {b('last', 'Last order', 'col-last')}
      {b('stage', 'Stage', 'col-stage')}
      {b('rep', 'Rep', 'col-rep')}
      <div>Next action</div>
      <div />
    </div>
  )
}

// ─────────────────────────────────────────────
// GROUPED LIST
// ─────────────────────────────────────────────
export function GroupedProviderTable({ rows }: { rows: Provider[] }) {
  const { collapsed, toggleCollapse, limits, loadMore, sortKey, sortDir } = useFilters()
  let any = false

  const sections = GROUPS.map(g => {
    const items = sortProviders(rows.filter(x => x.bucket === g.k), sortKey, sortDir)
    if (!items.length) return null
    any = true
    const isClosed = collapsed.has(g.k)
    const limit = limits[g.k] || PER_PAGE
    const page = items.slice(0, limit)
    const rest = items.length - page.length

    return (
      <section className="group" key={g.k}>
        <button
          className={`gh ${isClosed ? 'closed' : ''}`}
          aria-expanded={!isClosed}
          onClick={() => toggleCollapse(g.k)}
        >
          <ChevronDown />
          <span className="gdot" style={{ background: g.col }} />
          <h2>{g.t}</h2>
          <span className="gc">{items.length}</span>
          <span className="grule" />
          <span className="gsub">{g.sub}</span>
        </button>
        {!isClosed && (
          <div className={`tbl ${g.k === 'urg' ? 'urg' : ''}`}>
            <ProviderThead />
            {page.map(x => <ProviderRow key={x.id} x={x} />)}
            {rest > 0 && (
              <button className="more-btn" onClick={() => loadMore(g.k, PER_PAGE)}>
                Show {Math.min(PER_PAGE, rest)} more · {rest} still hidden
              </button>
            )}
          </div>
        )}
      </section>
    )
  })

  if (!any) {
    return (
      <div className="panel">
        <div className="empty"><b>No accounts match</b>Try removing a filter.</div>
      </div>
    )
  }
  return <>{sections}</>
}

// ─────────────────────────────────────────────
// FLAT LIST (no grouping) — used on Overview's "Your day" panel
// ─────────────────────────────────────────────
export function FlatProviderTable({ rows, urgent }: { rows: Provider[]; urgent?: boolean }) {
  if (!rows.length) {
    return (
      <div className="tbl">
        <div className="empty"><b>Nothing urgent right now</b>No account needs a call today.</div>
      </div>
    )
  }
  return (
    <div className={`tbl ${urgent ? 'urg' : ''}`}>
      <ProviderThead />
      {rows.map(x => <ProviderRow key={x.id} x={x} />)}
    </div>
  )
}

// ─────────────────────────────────────────────
// PIPELINE (kanban)
// ─────────────────────────────────────────────
export function PipelineView({
  rows, columns,
}: {
  rows: Provider[]
  columns: [Provider['stage'], string][]
}) {
  const { setStage, sortKey, sortDir } = useFilters()
  const { openDrawer, toast } = useUI()

  return (
    <div className="pipe">
      {columns.map(([k, sla]) => {
        const items = sortProviders(rows.filter(x => x.stage === k), sortKey, sortDir)
        return (
          <div className="col" key={k}>
            <button className="col-h" onClick={() => { setStage(k); toast(`Stage: ${STAGE[k].t}`) }}>
              <h3>{STAGE[k].t}</h3>
              <span className="c">{items.length}</span>
              <span className="sla">{sla}</span>
            </button>
            {items.length ? items.map(x => {
              const border = x.bucket === 'urg' ? 'urg' : x.bucket === 'warn' ? 'warn' : ''
              const dc = x.bucket === 'urg' ? 'urg' : x.bucket === 'warn' ? 'warn' : 'ok'
              const dt = x.orders > 0 ? 'activated' : !x.acc ? 'no date' : x.left <= 0 ? 'closed' : `${x.left} d`
              return (
                <button
                  key={x.id}
                  className={`card ${border}`}
                  onClick={() => openDrawer({ kind: 'p', id: x.id })}
                >
                  <span className="cn">{x.n}</span>
                  <span className="cm">
                    {flag(x.cc)} {x.c}{x.acc ? ` · access ${fmtShort(x.acc)}` : ''}
                  </span>
                  <span className="cf">
                    <span className={`cd ${dc}`}>{dt}</span>
                    <span className="crep">{x.rep ? x.rep.split(' ')[0] : 'no rep'}</span>
                  </span>
                </button>
              )
            }) : <div className="empty" style={{ padding: '14px 4px', fontSize: 12 }}>Empty</div>}
          </div>
        )
      })}
    </div>
  )
}
