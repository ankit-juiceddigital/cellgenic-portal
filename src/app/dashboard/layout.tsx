// File: src/app/dashboard/layout.tsx
// All dashboard pages are wrapped in ProtectedRoute.
// If not logged in, redirects to /auth/login automatically.

import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Sidebar } from '@/components/layout/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  )
}
