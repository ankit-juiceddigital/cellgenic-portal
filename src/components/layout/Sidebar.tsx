'use client'

// File: src/components/layout/Sidebar.tsx

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { getRoleLabel } from '@/lib/auth'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import {
  LayoutDashboard, Users, ShoppingCart, Coins, Link2,
  BarChart3, UserCheck, UserX, Settings,
  Trophy, ClipboardCheck, LogOut, ClipboardList, Boxes,
} from 'lucide-react'

// ─────────────────────────────────────────────
// ROLE-BASED NAV CONFIG
// Each role ONLY sees the items defined here.
// Adding an item to the wrong role = that role can access it.
// ─────────────────────────────────────────────
const NAV_CONFIG = {

  // Sales Rep — can only see their own clients, orders, commissions, referral link
  sales_rep: [
    { icon: LayoutDashboard, label: 'Dashboard',          href: '/dashboard' },
    { icon: Users,           label: 'My Clients',         href: '/clients' },
    { icon: ShoppingCart,    label: 'Place Order',         href: '/order' },
    { icon: ClipboardList,   label: 'My Orders',           href: '/orders' },
    { icon: ClipboardCheck,  label: 'My Referrals',        href: '/approvals' },
    { icon: Trophy,          label: 'Leaderboard',         href: '/leaderboard' },
    { icon: Coins,           label: 'My Commissions',      href: '/commissions' },
    { icon: Link2,           label: 'My Referral Link',    href: '/referral' },
  ],

  // Sales Manager — sees all clients and rep performance, but NOT admin controls
  sales_manager: [
    { icon: LayoutDashboard, label: 'Overview',           href: '/dashboard' },
    { icon: Users,           label: 'All Clients',        href: '/clients' },
    { icon: ShoppingCart,    label: 'Place Order',        href: '/order' },
    { icon: BarChart3,       label: 'Rep Performance',    href: '/reps' },
    { icon: ClipboardList,   label: 'Orders',             href: '/orders' },
    { icon: Trophy,          label: 'Leaderboard',        href: '/leaderboard' },
    { icon: Coins,           label: 'Commissions',        href: '/commissions' },
  ],

  // Administrator — full platform management: providers, clients, reps,
  // orders, inventory, revenue, and overall activity — not just approvals.
  administrator: [
    { icon: LayoutDashboard, label: 'Platform Overview',  href: '/dashboard' },
    { icon: Users,           label: 'All Clients',        href: '/clients' },
    { icon: UserCheck,       label: 'Sales Reps',         href: '/reps' },
    { icon: UserX,           label: 'Unassigned',         href: '/unassigned' },
    { icon: ClipboardCheck,  label: 'Provider Approvals', href: '/approvals' },
    { icon: ShoppingCart,    label: 'Place Order',        href: '/order' },
    { icon: ClipboardList,   label: 'Orders',             href: '/orders' },
    { icon: Boxes,           label: 'Inventory',          href: '/inventory' },
    { icon: Coins,           label: 'Commissions',        href: '/commissions' },
    { icon: Settings,        label: 'Settings',           href: '/settings' },
  ],
}

// ─────────────────────────────────────────────
// ROUTES EACH ROLE IS ALLOWED TO ACCESS
// Used to redirect unauthorized users away from pages they don't own.
// ─────────────────────────────────────────────
export const ALLOWED_ROUTES: Record<string, string[]> = {
  sales_rep: [
    '/dashboard', '/clients', '/order', '/orders', '/approvals',
    '/leaderboard', '/commissions', '/referral',
  ],
  sales_manager: [
    '/dashboard', '/clients', '/order', '/reps',
    '/orders', '/leaderboard', '/commissions',
  ],
  administrator: [
    '/dashboard', '/clients', '/reps', '/unassigned',
    '/approvals', '/order', '/orders', '/inventory', '/commissions', '/settings',
  ],
}

interface SidebarProps {
  /** Whether the mobile off-canvas drawer is open. Ignored on desktop (md+), where the sidebar is always visible. */
  mobileOpen?: boolean
  /** Called when the drawer should close on mobile (backdrop click, nav link tap, sign out). */
  onClose?: () => void
}

export function Sidebar({ mobileOpen = false, onClose }: SidebarProps) {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  if (!user) return null

  const navItems = NAV_CONFIG[user.role as keyof typeof NAV_CONFIG] || []

  const handleLogout = () => {
    logout()
    onClose?.()
    router.push('/auth/login')
  }

  return (
    <>
      {/* Mobile backdrop — tap to close */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'w-[220px] bg-white border-r border-gray-100 flex flex-col flex-shrink-0',
          // Mobile: fixed off-canvas drawer, anchored to actual viewport top/bottom
          // (no explicit height here — that's what inset-y-0 is for; setting an
          // explicit h-screen/100vh fights with it on mobile browsers whose
          // address bar makes 100vh taller than the real visible viewport).
          'fixed inset-y-0 left-0 z-50 transition-transform duration-200 ease-in-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          // Desktop: always visible, back in normal flow
          'md:static md:translate-x-0 md:z-auto md:min-h-screen'
        )}
      >

        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-100">
          <Image
            src="https://cellgenic.com/wp-content/uploads/2026/05/cellgenic_official_logo_black.png"
            alt="CellGenic"
            width={140}
            height={36}
            style={{ objectFit: 'contain', display: 'inline-block' }}
            unoptimized
          />
        </div>

        {/* Nav items — only shows items for this user's role */}
        <nav className="flex-1 min-h-0 py-3 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const active =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href))

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-2.5 px-5 py-2 text-sm transition-colors',
                  active
                    ? 'bg-gray-50 text-gray-900 font-medium'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                )}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* User info + logout */}
        <div className="flex-shrink-0 px-4 py-4 border-t border-gray-100">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-700 flex-shrink-0">
              {user.initials}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-400">{getRoleLabel(user.role)}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-700 transition-colors w-full py-1"
          >
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      </aside>
    </>
  )
}
