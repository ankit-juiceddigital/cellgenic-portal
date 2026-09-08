'use client'
// File: src/components/ui/FilterBar.tsx
//
// .bar → .actives → .bulk, in that order, which is what the CSS expects
// (the mobile rules turn .bar into a horizontal scroller and pin .bulk
// above the tab bar).

import { useMemo } from 'react'
import { useFilters } from '@/lib/filter-context'
import { useUI } from '@/lib/ui-context'
import { usePortal } from '@/hooks/usePortal'
import { flag, STAGE, STAGE_KEYS } from '@/lib/portal-model'
import type { Provider, Stage } from '@/types/portal'
import { RepPickerSheet } from '@/components/ui/Sheet'

export function FilterBar({ withView = false }: { withView?: boolean }) {
  const f = useFilters()
  const { providers, repNames } = usePortal()

  // Country options come from the data, so a new market appears in the
  // filter the moment a provider from it exists.
  const countries = useMemo(() => {
    const map = new Map<string, string>()
    providers.forEach(p => { if (p.c) map.set(p.c, p.cc) })
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [providers])


  return (
    <>
      <div className="bar">
        {withView && (
          <div className="seg">
            <button className={f.view === 'list' ? 'on' : ''} onClick={() => f.setView('list')}>List</button>
            <button className={f.view === 'pipe' ? 'on' : ''} onClick={() => f.setView('pipe')}>Pipeline</button>
          </div>
        )}

        <select
          className="chipbtn"
          aria-label="Filter by country"
          value={f.country}
          onChange={e => f.setCountry(e.target.value)}
        >
          <option value="">Country: all</option>
          {countries.map(([name, cc]) => (
            <option key={name} value={name}>{flag(cc)} {name}</option>
          ))}
        </select>

        <select
          className="chipbtn"
          aria-label="Filter by rep"
          value={f.rep}
          onChange={e => f.setRep(e.target.value)}
        >
          <option value="">Rep: all</option>
          {repNames.map(r => <option key={r} value={r}>{r}</option>)}
          <option value="__none">Unassigned</option>
        </select>

        <select
          className="chipbtn"
          aria-label="Filter by stage"
          value={f.stage}
          onChange={e => f.setStage(e.target.value as Stage | '')}
        >
          <option value="">Stage: all</option>
          {STAGE_KEYS.map(k => <option key={k} value={k}>{STAGE[k].t}</option>)}
        </select>

        <button className={`chipbtn ${f.danger ? 'on' : ''}`} onClick={f.toggleDanger}>
          At risk (≤5 days)
        </button>
        <button className={`chipbtn ${f.dense ? 'on' : ''}`} onClick={f.toggleDense}>
          Compact rows
        </button>

        <span className="spacer" />
        <button className="linkish" onClick={f.clearFilters}>Clear</button>
      </div>

      <ActiveChips />
      <BulkBar />
    </>
  )
}

function ActiveChips() {
  const f = useFilters()
  const chips: [string, string, () => void][] = []
  if (f.term.trim()) chips.push(['term', `Search: "${f.term.trim()}"`, () => f.clearOne('term')])
  if (f.country) chips.push(['country', `Country: ${f.country}`, () => f.clearOne('country')])
  if (f.rep) chips.push(['rep', `Rep: ${f.rep === '__none' ? 'unassigned' : f.rep}`, () => f.clearOne('rep')])
  if (f.stage) chips.push(['stage', `Stage: ${STAGE[f.stage].t}`, () => f.clearOne('stage')])
  if (f.danger) chips.push(['danger', 'At risk (≤5 days)', () => f.clearOne('danger')])

  if (!chips.length) return null

  return (
    <div className="actives">
      {chips.map(([k, label, clear]) => (
        <button key={k} className="fchip" onClick={clear}>
          {label}<span className="x">✕</span>
        </button>
      ))}
      <button className="linkish" onClick={f.clearFilters} style={{ alignSelf: 'center' }}>Clear all</button>
    </div>
  )
}

function BulkBar() {
  const f = useFilters()
  const { openSheet, toast } = useUI()
  const { repNames, reps, assignRep, extend } = usePortal()
  const ids = [...f.selected]

  if (!ids.length) return null

  return (
    <div className="bulk">
      <span>{ids.length} selected</span>

      <button
        className="bb"
        onClick={() => openSheet(
          <RepPickerSheet
            ids={ids}
            repNames={repNames}
            reps={reps}
            onPick={async (code, name) => {
              await assignRep(ids, code, name)
              f.clearSelection()
              toast(code
                ? `${ids.length} account${ids.length > 1 ? 's' : ''} assigned to ${name}.`
                : 'Assignment removed.')
            }}
          />,
        )}
      >Assign rep</button>

      <button
        className="bb"
        onClick={async () => {
          const res = await extend(ids, 15)
          f.clearSelection()
          toast(`Window extended 15 days on ${res.changed} account${res.changed === 1 ? '' : 's'}.`)
        }}
      >Extend 15 days</button>

      {/* Undo for the bulk case. Selection is kept until the action runs,
          so this reverses exactly the rows that were just extended. */}
      <button
        className="bb"
        onClick={async () => {
          const res = await extend(ids, -15)
          f.clearSelection()
          toast(res.changed
            ? `15 days removed from ${res.changed} account${res.changed === 1 ? '' : 's'}.`
            : 'None of the selected accounts had an extension to remove.')
        }}
      >Undo 15 days</button>

      {/* "Send guide" is in the design but there is no email endpoint for
          it yet, so it says so rather than pretending to send. */}
      <button
        className="bb"
        onClick={() => toast('Guide email is not wired up yet — needs a Brevo template ID.')}
      >Send guide</button>

      <button className="x" onClick={f.clearSelection}>Cancel</button>
    </div>
  )
}

/** Shared row-level filter predicate. Kept next to the bar that sets it. */
export function useProviderFilter() {
  const f = useFilters()
  return (x: Provider) => {
    const q = f.term.trim().toLowerCase()
    if (q) {
      // Every field a rep might search by, including the rep's own name so
      // "rudy" finds their accounts. Spaces are normalised so "calla
      // kleene" matches "Calla  Kleene".
      const hay = `${x.n} ${x.e} ${x.p} ${x.c} ${x.clinic || ''} ${x.rep || ''}`
        .toLowerCase().replace(/\s+/g, ' ')
      if (!hay.includes(q.replace(/\s+/g, ' '))) return false
    }
    if (f.country && x.c !== f.country) return false
    if (f.rep === '__none' && x.rep) return false
    if (f.rep && f.rep !== '__none' && x.rep !== f.rep) return false
    if (f.stage && x.stage !== f.stage) return false
    if (f.danger && x.bucket !== 'urg') return false
    return true
  }
}
