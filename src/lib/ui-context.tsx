'use client'
// File: src/lib/ui-context.tsx
//
// The prototype ran the drawer, the bottom sheet and the toast off three
// module-level globals plus a full innerHTML re-render. In React they
// become one provider so any component at any depth can open a drawer
// on a record it doesn't own — which is what makes the cross-links work
// (order → client → rep → back to order).
//
// The drawer keeps a STACK, not a single ref. `push` records where you
// came from and renders the "← Back to Order #4824" affordance, exactly
// as the design does.

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from 'react'
import type { DrawerFrame, DrawerRef } from '@/types/portal'

interface UIContextValue {
  // drawer
  drawer: DrawerRef | null
  stack: DrawerFrame[]
  openDrawer: (ref: DrawerRef, from?: DrawerFrame) => void
  drawerBack: () => void
  closeDrawer: () => void
  // sheet
  sheet: ReactNode | null
  openSheet: (content: ReactNode) => void
  closeSheet: () => void
  // toast
  toast: (message: string) => void
  toastMessage: string | null
  // everything
  closeAll: () => void
}

const UIContext = createContext<UIContextValue | null>(null)

export function UIProvider({ children }: { children: ReactNode }) {
  const [drawer, setDrawer] = useState<DrawerRef | null>(null)
  const [stack, setStack] = useState<DrawerFrame[]>([])
  const [sheet, setSheet] = useState<ReactNode | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const toast = useCallback((message: string) => {
    setToastMessage(message)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToastMessage(null), 2800)
  }, [])

  const closeSheet = useCallback(() => setSheet(null), [])

  const openSheet = useCallback((content: ReactNode) => setSheet(content), [])

  const openDrawer = useCallback((ref: DrawerRef, from?: DrawerFrame) => {
    // A `from` frame means this is a cross-link, so remember it. No
    // frame means a fresh open from a list, which clears the trail.
    setStack(prev => (from ? [...prev, from] : []))
    setDrawer(ref)
    setSheet(null)
  }, [])

  const drawerBack = useCallback(() => {
    setStack(prev => {
      if (!prev.length) return prev
      const next = prev.slice(0, -1)
      setDrawer(prev[prev.length - 1].ref)
      return next
    })
  }, [])

  const closeDrawer = useCallback(() => {
    setDrawer(null)
    setStack([])
  }, [])

  const closeAll = useCallback(() => {
    setDrawer(null)
    setStack([])
    setSheet(null)
  }, [])

  // Escape closes the topmost layer, matching the prototype's keydown
  // handler.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeAll() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [closeAll])

  // Body scroll lock while a layer is open — the prototype didn't need
  // this because it never scrolled behind a drawer on desktop, but on
  // mobile the drawer is a 93vh sheet and the page scrolls under it.
  useEffect(() => {
    const open = Boolean(drawer || sheet)
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawer, sheet])

  const value = useMemo<UIContextValue>(() => ({
    drawer, stack, openDrawer, drawerBack, closeDrawer,
    sheet, openSheet, closeSheet,
    toast, toastMessage, closeAll,
  }), [drawer, stack, openDrawer, drawerBack, closeDrawer, sheet, openSheet, closeSheet, toast, toastMessage, closeAll])

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>
}

export function useUI() {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error('useUI must be used within UIProvider')
  return ctx
}
