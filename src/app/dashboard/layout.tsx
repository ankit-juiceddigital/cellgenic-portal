// File: src/app/dashboard/layout.tsx
// All dashboard pages are wrapped in ProtectedRoute.
// If not logged in, redirects to /auth/login automatically.

import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AppShell } from '@/components/layout/AppShell'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AppShell>{children}</AppShell>
    </ProtectedRoute>
  )
}
