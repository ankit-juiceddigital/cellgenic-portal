'use client'
// File: src/components/shell/Sidebar.tsx
//
// Three sections — Operations / Alerts / Team — exactly as the design.
// The Alerts group is not navigation: each item jumps to Activation AND
// applies a filter preset, which is why it goes through goWithAlert().

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useFilters } from '@/lib/filter-context'
import { usePortal } from '@/hooks/usePortal'
import { useMyReferralStats } from '@/hooks/useData'
import { counts, initials } from '@/lib/portal-model'
import { NavIcon } from '@/components/ui/Icons'
import { Copy, Check } from 'lucide-react'

export interface NavItem {
  key: string
  label: string
  href: string
  icon: string
  count?: number | null
}

/**
 * Which routes each role sees. The live portal has seven pages the
 * prototype never covered (VIP, unassigned, inventory, commissions,
 * referral, calculator, settings) — they are kept and slotted into these
 * sections rather than dropped, since they are all in use. See the
 * implementation plan.
 */
export function useNav() {
  const { user } = useAuth()
  const { providers, orders, approvals, loading } = usePortal()
  // While the first fetch is in flight the arrays are empty, so counts()
  // returns 0 for everything. Rendering that looks like real data — "0
  // urgent, 0 approvals" — which then jumps to the true numbers. Nav
  // counts are therefore blanked until the data has actually arrived.
  const c = counts(providers, orders, approvals)
  const n = (v: number) => (loading ? null : v)
  const role = user?.role
  const isStaffLead = role === 'administrator' || role === 'sales_manager'

  return useMemo(() => {
    const operations: NavItem[] = [
      { key: 'overview',   label: 'Overview',       href: '/dashboard',   icon: 'overview',   count: null },
      { key: 'activation', label: 'Activation',     href: '/activation',  icon: 'activation', count: n(c.win) },
      { key: 'clients',    label: 'Active clients', href: '/clients',     icon: 'clients',    count: n(c.act) },
      { key: 'orders',     label: 'Orders',         href: '/orders',      icon: 'orders',     count: n(c.ord) },
      { key: 'approvals',  label: role === 'sales_rep' ? 'My referrals' : 'Approvals', href: '/approvals', icon: 'approvals', count: n(c.apr) },
    ]

    const team: NavItem[] = isStaffLead
      ? [
          { key: 'reps',        label: 'Reps',        href: '/reps',        icon: 'reps' },
          { key: 'leaderboard', label: 'Leaderboard', href: '/leaderboard', icon: 'leaderboard' },
        ]
      : [{ key: 'leaderboard', label: 'Leaderboard', href: '/leaderboard', icon: 'leaderboard' }]

    // TOOLS — hidden for now, per Ankit (2 Sep). The pages still exist and
    // still work; they're just not in the nav. Uncomment the block below to
    // bring them back.
    const tools: NavItem[] = []
    // const tools: NavItem[] = [
    //   { key: 'calculator', label: 'Calculator', href: '/calculator', icon: 'calculator' },
    //   { key: 'referral',   label: 'Referral link', href: '/referral', icon: 'referral' },
    //   ...(role === 'administrator'
    //     ? [
    //         { key: 'inventory', label: 'Inventory', href: '/inventory', icon: 'inventory' },
    //         { key: 'settings',  label: 'Settings',  href: '/settings',  icon: 'settings' },
    //       ]
    //     : []),
    // ]

    return { operations, team, tools, c, loading }
  }, [c, role, isStaffLead, loading])
}

function NavButton({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link href={item.href} className={active ? 'on' : undefined}>
      <NavIcon name={item.icon} />
      <span className="nlb">{item.label}</span>
      <span className="nct">{item.count ?? ''}</span>
    </Link>
  )
}

// Compact, always-visible referral link for the current user — separate
// from the full /referral page (stats, QR code, share options). Renders
// nothing if this account has no rep code (e.g. administrators), so it
// never shows a broken/empty state in the nav.
//
// Made resilient: previously a single failed /my-referral-stats request
// (a slow or rate-limited WordPress moment on page load) hid the link
// for the whole session with no retry. Now it:
//   1. shows the last good link instantly (kept per user in
//      sessionStorage, wiped on logout with the portal snapshot),
//   2. retries a failed request a few times,
//   3. and if it still can't load, builds the link from the rep code
//      already in the session — same format as EditRepModal.
const REF_RETRY_DELAYS = [2000, 5000, 15000]
const refCacheKey = (userId?: number) => (userId ? `cg_portal_snap:ref:${userId}` : null)

function readCachedRef(key: string | null): string | null {
  if (!key || typeof window === 'undefined') return null
  try { return window.sessionStorage.getItem(key) } catch { return null }
}

function SidebarReferralLink() {
  const { user } = useAuth()
  const { data, error, refetch } = useMyReferralStats()
  const [copied, setCopied] = useState(false)
  const cacheKey = refCacheKey(user?.userId)
  const [cached, setCached] = useState<string | null>(() => readCachedRef(cacheKey))
  const attempts = useRef(0)

  // Remember a good link.
  useEffect(() => {
    if (!data?.referral_url || !cacheKey) return
    setCached(data.referral_url)
    try { window.sessionStorage.setItem(cacheKey, data.referral_url) } catch { /* ignore */ }
  }, [data?.referral_url, cacheKey])

  // Retry transient failures. "No rep code" is a real answer, not a failure.
  const noRepCode = Boolean(error && /no rep code/i.test(error))
  useEffect(() => {
    if (!error || noRepCode || attempts.current >= REF_RETRY_DELAYS.length) return
    const t = setTimeout(() => { attempts.current++; refetch() }, REF_RETRY_DELAYS[attempts.current])
    return () => clearTimeout(t)
  }, [error, noRepCode, refetch])

  const fallback = user?.repCode ? `cellgenic.com/register/?rep=${user.repCode}` : null
  const url = noRepCode ? null : (data?.referral_url || cached || (error ? fallback : null))

  if (!url) return null

  const handleCopy = () => {
    navigator.clipboard.writeText('https://' + url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <p className="navsec">Your referral link</p>
      <div className="refbox">
        <span className="mono">{url}</span>
        <button onClick={handleCopy} title="Copy referral link">
          {copied ? <Check size={13} /> : <Copy size={13} />}
        </button>
      </div>
    </div>
  )
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const { goWithAlert } = useFilters()
  const { operations, team, tools, c, loading } = useNav()

  // Longest matching href wins, so /clients doesn't light up on
  // /clients/vip when a dedicated item exists for it.
  const activeHref = useMemo(() => {
    const all = [...operations, ...team, ...tools].map(i => i.href)
    return all
      .filter(h => pathname === h || pathname.startsWith(h + '/'))
      .sort((a, b) => b.length - a.length)[0]
  }, [operations, team, tools, pathname])

  const alert = (key: 'urg' | 'dead' | 'norep', icon: string, label: string, count: number, hot = false) => (
    <button
      key={key}
      onClick={() => { goWithAlert('/activation', key); onNavigate?.() }}
    >
      <NavIcon name={icon} />
      <span className="nlb">{label}</span>
      <span className={hot ? 'nct hot' : 'nct'}>{loading ? '' : count}</span>
    </button>
  )

  return (
    <aside className="side">
      <div className="brand">
        <div className="bmark">C</div>
        <div className="bname">CELLGENIC</div>
      </div>

      <div>
        <p className="navsec">Operations</p>
        <nav className="nav" onClick={onNavigate}>
          {operations.map(i => <NavButton key={i.key} item={i} active={i.href === activeHref} />)}
        </nav>
      </div>

      <div>
        <p className="navsec">Alerts</p>
        <nav className="nav">
          {alert('urg', 'alert', 'Closing in ≤5 days', c.urg, true)}
          {alert('dead', 'clock', 'Expired accounts', c.dead)}
          {alert('norep', 'userx', 'No rep assigned', c.norep)}
        </nav>
      </div>

      <div>
        <p className="navsec">Team</p>
        <nav className="nav" onClick={onNavigate}>
          {team.map(i => <NavButton key={i.key} item={i} active={i.href === activeHref} />)}
        </nav>
      </div>

      {tools.length > 0 && (
        <div>
          <p className="navsec">Tools</p>
          <nav className="nav" onClick={onNavigate}>
            {tools.map(i => <NavButton key={i.key} item={i} active={i.href === activeHref} />)}
          </nav>
        </div>
      )}

      <SidebarReferralLink />

      <div className="side-foot">
        <button onClick={logout} title="Sign out">
          <span className="av">{user ? initials(user.name) : '—'}</span>
          <span>
            <span style={{ fontWeight: 500, fontSize: 12.5, display: 'block' }}>{user?.name}</span>
            <span style={{ color: 'var(--muted)', fontSize: 11 }}>
              {user?.role === 'administrator'
                ? 'Administrator'
                : user?.role === 'sales_manager'
                  ? 'Sales Manager'
                  : 'Rep · own accounts only'}
            </span>
          </span>
        </button>
      </div>
    </aside>
  )
}
