'use client'

// File: src/components/layout/AppShell.tsx
//
// Shared layout shell used by every route's layout.tsx. Centralizes the
// mobile sidebar drawer state so we don't duplicate hamburger/backdrop
// logic across every route folder.

import { useState } from 'react'
import { Menu } from 'lucide-react'
import Image from 'next/image'
import { Sidebar } from '@/components/layout/Sidebar'

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-screen">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile-only top bar with hamburger toggle — hidden on desktop since the Sidebar is always visible there */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white sticky top-0 z-30">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="p-1.5 -ml-1.5 text-gray-600 hover:bg-gray-50 rounded-lg"
          >
            <Menu size={22} />
          </button>
          <Image
            src="https://cellgenic.com/wp-content/uploads/2026/05/cellgenic_official_logo_black.png"
            alt="CellGenic"
            width={110}
            height={28}
            style={{ objectFit: 'contain' }}
            unoptimized
          />
        </div>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
