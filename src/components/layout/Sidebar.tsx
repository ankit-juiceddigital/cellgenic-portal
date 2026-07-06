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
  BarChart3, UserCheck, UserX, Settings, Calculator,
  Trophy, ClipboardCheck, LogOut,
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
    { icon: Calculator,      label: 'Peptide Calculator',  href: '/calculator' },
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
    { icon: Trophy,          label: 'Leaderboard',        href: '/leaderboard' },
    { icon: Coins,           label: 'Commissions',        href: '/commissions' },
  ],

  // Administrator — full access including approvals, unassigned, settings
  administrator: [
    { icon: LayoutDashboard, label: 'Platform Overview',  href: '/dashboard' },
    { icon: Users,           label: 'All Clients',        href: '/clients' },
    { icon: UserCheck,       label: 'Sales Reps',         href: '/reps' },
    { icon: UserX,           label: 'Unassigned',         href: '/unassigned' },
    { icon: ClipboardCheck,  label: 'Provider Approvals', href: '/approvals' },
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
    '/dashboard', '/clients', '/order', '/calculator',
    '/leaderboard', '/commissions', '/referral',
  ],
  sales_manager: [
    '/dashboard', '/clients', '/order', '/reps',
    '/leaderboard', '/commissions',
  ],
  administrator: [
    '/dashboard', '/clients', '/reps', '/unassigned',
    '/approvals', '/commissions', '/settings',
  ],
}

export function Sidebar() {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  if (!user) return null

  const navItems = NAV_CONFIG[user.role as keyof typeof NAV_CONFIG] || []

  const handleLogout = () => {
    logout()
    router.push('/auth/login')
  }

  return (
    <aside className="w-[220px] bg-white border-r border-gray-100 flex flex-col flex-shrink-0 min-h-screen">

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
      <nav className="flex-1 py-3">
        {navItems.map((item) => {
          const Icon = item.icon
          const active =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
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
      <div className="px-4 py-4 border-t border-gray-100">
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
  )
}
