'use client'

// File: src/components/layout/Sidebar.tsx
// This replaces the prototype sidebar — no more role switcher toggle.
// Shows real user from auth context, real role-based nav.

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { getRoleLabel } from '@/lib/auth'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Users, ShoppingCart, Coins, Link2,
  BarChart3, UserCheck, UserX, Settings, Calculator,
  Trophy, ClipboardCheck, LogOut,
} from 'lucide-react'

const NAV_CONFIG = {
  sales_rep: [
    { icon: LayoutDashboard, label: 'Dashboard',         href: '/dashboard' },
    { icon: Users,           label: 'My Clients',        href: '/clients' },
    { icon: ShoppingCart,    label: 'Place Order',        href: '/order' },
    { icon: Calculator,      label: 'Peptide Calculator', href: '/calculator' },
    { icon: Trophy,          label: 'Leaderboard',        href: '/leaderboard' },
    { icon: Coins,           label: 'My Orders',          href: '/commissions' },
    { icon: Link2,           label: 'My Referral Link',   href: '/referral' },
  ],
  sales_manager: [
    { icon: LayoutDashboard, label: 'Overview',          href: '/dashboard' },
    { icon: Users,           label: 'All Clients',       href: '/clients' },
    { icon: BarChart3,       label: 'Rep Performance',   href: '/reps' },
    { icon: Trophy,          label: 'Leaderboard',       href: '/leaderboard' },
    { icon: Coins,           label: 'Commissions',       href: '/commissions' },
  ],
  administrator: [
    { icon: LayoutDashboard, label: 'Platform Overview', href: '/dashboard' },
    { icon: Users,           label: 'All Clients',       href: '/clients' },
    { icon: UserCheck,       label: 'Sales Reps',        href: '/reps' },
    { icon: UserX,           label: 'Unassigned',        href: '/unassigned' },
    { icon: ClipboardCheck,  label: 'Provider Approvals',href: '/approvals' },
    { icon: Coins,           label: 'Commissions',       href: '/commissions' },
    { icon: Settings,        label: 'Settings',          href: '/settings' },
  ],
}

export function Sidebar() {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  if (!user) return null

  const navItems = NAV_CONFIG[user.role] || []

  const handleLogout = () => {
    logout()
    router.push('/auth/login')
  }

  return (
    <aside className="w-[220px] bg-white border-r border-gray-100 flex flex-col flex-shrink-0 min-h-screen">

      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100">
        <p className="text-sm font-semibold text-gray-900 tracking-wide">CellGenic</p>
        <p className="text-xs text-gray-400 mt-0.5">Provider Sales Portal</p>
      </div>

      {/* Nav items */}
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
