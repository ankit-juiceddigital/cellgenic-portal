'use client'
// File: src/components/shell/PortalLayout.tsx
//
// One wrapper for every authenticated page. The old app had nine
// byte-identical layout.tsx files; this replaces them, and each route's
// layout.tsx is a two-line re-export of it.
//
// Provider order matters: UIProvider must sit above FilterProvider
// (filter actions raise toasts), and PortalProvider must sit above
// AppShell (the sidebar reads live counts from it).

import type { ReactNode } from 'react'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { UIProvider } from '@/lib/ui-context'
import { FilterProvider } from '@/lib/filter-context'
import { PortalProvider } from '@/hooks/usePortal'
import { AppShell } from '@/components/shell/AppShell'

export function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <UIProvider>
        <FilterProvider>
          <PortalProvider>
            <AppShell>{children}</AppShell>
          </PortalProvider>
        </FilterProvider>
      </UIProvider>
    </ProtectedRoute>
  )
}
