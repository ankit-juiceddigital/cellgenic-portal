'use client'
// File: src/lib/filter-context.tsx
//
// In the prototype the filters were module-level globals, which is why a
// sidebar alert, a stat card, a country chip inside a table row and the
// drawer could all set the same filter and then re-render one list.
//
// That cross-talk is a real feature of the design, not an accident:
// "No rep assigned" in the sidebar navigates to Activation AND sets
// rep=unassigned. So the filter state lives above the router, not inside
// a page.

import {
  createContext, useCallback, useContext, useMemo, useState, type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import type { SortKey } from '@/lib/portal-model'
import type { Bucket, Stage } from '@/types/portal'

export type AlertKey = 'urg' | 'dead' | 'norep' | null

interface FilterState {
  term: string
  country: string
  rep: string            // '' | rep name | '__none'
  stage: Stage | ''
  danger: boolean        // "At risk (≤5 days)"
  view: 'list' | 'pipe'
  dense: boolean
  sortKey: SortKey
  sortDir: 1 | -1
  selected: Set<number>          // provider WP ids
  collapsed: Set<string>         // folded groups + the "why" panel
  limits: Record<string, number> // per-group "show more" ceiling
}

interface FilterContextValue extends FilterState {
  setTerm: (v: string) => void
  setCountry: (v: string) => void
  setRep: (v: string) => void
  setStage: (v: Stage | '') => void
  toggleDanger: () => void
  setView: (v: 'list' | 'pipe') => void
  toggleDense: () => void
  sortBy: (k: SortKey) => void
  toggleSelect: (id: number) => void
  clearSelection: () => void
  toggleCollapse: (k: string) => void
  loadMore: (k: string, step: number) => void
  clearFilters: () => void
  clearOne: (k: 'term' | 'country' | 'rep' | 'stage' | 'danger') => void
  /** Navigate to a page and apply an alert preset in one action. */
  goWithAlert: (path: string, alert?: AlertKey) => void
}

const FilterContext = createContext<FilterContextValue | null>(null)

const EMPTY: FilterState = {
  term: '', country: '', rep: '', stage: '', danger: false,
  view: 'list', dense: false, sortKey: 'left', sortDir: 1,
  selected: new Set(), collapsed: new Set(), limits: {},
}

export function FilterProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<FilterState>(EMPTY)
  const router = useRouter()

  const patch = useCallback((p: Partial<FilterState>) => setS(prev => ({ ...prev, ...p })), [])

  const sortBy = useCallback((k: SortKey) => {
    setS(prev => prev.sortKey === k
      ? { ...prev, sortDir: (prev.sortDir * -1) as 1 | -1 }
      : { ...prev, sortKey: k, sortDir: 1 })
  }, [])

  const toggleSelect = useCallback((id: number) => {
    setS(prev => {
      const next = new Set(prev.selected)
      next.has(id) ? next.delete(id) : next.add(id)
      return { ...prev, selected: next }
    })
  }, [])

  const toggleCollapse = useCallback((k: string) => {
    setS(prev => {
      const next = new Set(prev.collapsed)
      next.has(k) ? next.delete(k) : next.add(k)
      return { ...prev, collapsed: next }
    })
  }, [])

  const loadMore = useCallback((k: string, step: number) => {
    setS(prev => ({ ...prev, limits: { ...prev.limits, [k]: (prev.limits[k] || step) + step } }))
  }, [])

  const clearFilters = useCallback(() => {
    setS(prev => ({ ...prev, term: '', country: '', rep: '', stage: '', danger: false }))
  }, [])

  const clearOne = useCallback((k: 'term' | 'country' | 'rep' | 'stage' | 'danger') => {
    setS(prev => ({ ...prev, [k]: k === 'danger' ? false : '' } as FilterState))
  }, [])

  const goWithAlert = useCallback((path: string, alert: AlertKey = null) => {
    setS(prev => ({
      ...prev,
      country: '', rep: alert === 'norep' ? '__none' : '', stage: alert === 'dead' ? 'dead' : '',
      danger: alert === 'urg',
      view: 'list',
      selected: new Set(),
    }))
    router.push(path)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 })
  }, [router])

  const value = useMemo<FilterContextValue>(() => ({
    ...s,
    setTerm: v => patch({ term: v }),
    setCountry: v => patch({ country: v }),
    setRep: v => patch({ rep: v }),
    setStage: v => patch({ stage: v }),
    toggleDanger: () => setS(prev => ({ ...prev, danger: !prev.danger })),
    setView: v => patch({ view: v }),
    toggleDense: () => setS(prev => ({ ...prev, dense: !prev.dense })),
    sortBy, toggleSelect,
    clearSelection: () => patch({ selected: new Set() }),
    toggleCollapse, loadMore, clearFilters, clearOne, goWithAlert,
  }), [s, patch, sortBy, toggleSelect, toggleCollapse, loadMore, clearFilters, clearOne, goWithAlert])

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>
}

export function useFilters() {
  const ctx = useContext(FilterContext)
  if (!ctx) throw new Error('useFilters must be used within FilterProvider')
  return ctx
}
