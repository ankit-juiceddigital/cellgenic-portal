// File: src/components/layout/Topbar.tsx
//
// LEGACY SHIM. The pages that haven't been migrated to the v2 design yet
// (inventory, calculator, referral, settings, order, commissions,
// unassigned, clients/vip, clients/[id], reps/[id]) each render their own
// <Topbar title subtitle actions />.
//
// In the v2 shell the page title and subtitle come from AppShell's
// PAGE_META, so rendering them again here produced two stacked headers.
// This shim therefore DROPS title/subtitle and renders only the actions
// row, using the design's .bar class so it lines up with the migrated
// pages. The props stay in the signature so no legacy page needs editing.
//
// When a page is migrated to v2, delete its <Topbar> call and add its
// route to PAGE_META instead.

import { ReactNode } from 'react'

interface TopbarProps {
  /** Ignored — AppShell renders the page title. Kept for compatibility. */
  title?: string
  /** Ignored — see above. */
  subtitle?: string
  actions?: ReactNode
}

export function Topbar({ actions }: TopbarProps) {
  if (!actions) return null
  return (
    <div className="bar">
      <span className="spacer" />
      {actions}
    </div>
  )
}
