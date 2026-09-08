'use client'
// File: src/components/shell/AppShell.tsx
//
// Owns everything outside the page body: the sidebar, the mobile top bar
// and bottom tab bar, the diagonal name watermark, and the three overlay
// layers (scrim → drawer → sheet → toast).
//
// Note on the watermark and the copy blocks: the design puts the
// viewer's name across every screen and disables copy / right-click /
// drag. Those are deterrents, not security — anyone can screenshot. They
// are implemented because the design asks for them and because the
// audit log behind the reveal button is the part that actually bites.

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useFilters } from '@/lib/filter-context'
import { useUI } from '@/lib/ui-context'
import { usePortal } from '@/hooks/usePortal'
import { counts, fmt, today } from '@/lib/portal-model'
import { Sidebar, useNav } from '@/components/shell/Sidebar'
import { MenuIcon, NavIcon, SearchIcon } from '@/components/ui/Icons'
import { DrawerHost } from '@/components/ui/Drawer'
import { SheetHost } from '@/components/ui/Sheet'
import { Toast } from '@/components/ui/Toast'

const PAGE_META: Record<string, { t: string; s: string }> = {
  '/dashboard':   { t: 'Overview',       s: 'What needs attention today' },
  '/activation':  { t: 'Activation',     s: '30-day window from access granted to first order' },
  '/clients':     { t: 'Active clients', s: 'Accounts that have ordered at least once' },
  '/orders':      { t: 'Orders',         s: 'All recorded activity' },
  '/approvals':   { t: 'Approvals',      s: 'Access requests awaiting review' },
  '/reps':        { t: 'Reps',           s: 'Workload and activation rate' },
  '/leaderboard': { t: 'Leaderboard',    s: 'Team performance this month' },
  '/inventory':   { t: 'Inventory',      s: 'Live warehouse stock' },
  '/calculator':  { t: 'Calculator',     s: 'Reconstitution and draw volume' },
  '/referral':    { t: 'Referral link',  s: 'Your unique provider registration link' },
  '/settings':    { t: 'Settings',       s: 'Platform configuration' },
  // Routes not yet migrated to the v2 design. They still render their own
  // <Topbar actions>, but the title now comes from here.
  '/clients/vip': { t: 'VIP clients',    s: 'Providers flagged as VIP' },
  '/unassigned':  { t: 'Unassigned',     s: 'Providers registered without a referral code' },
  '/commissions': { t: 'Commissions',    s: 'Earnings and payout history' },
  '/order':       { t: 'Place an order', s: "Order on a client's behalf" },
  '/reps/':       { t: 'Rep detail',     s: 'Workload and order history' },
}

function Watermark() {
  const { user } = useAuth()
  const stamp = useMemo(() => `${user?.name || ''} · ${fmt(today())} · CellGenic confidential`, [user?.name])
  return (
    <div className="mark" aria-hidden="true">
      {Array.from({ length: 28 }, (_, k) => (
        <span key={k} style={{ top: `${(k % 14) * 8 - 3}%`, left: `${k % 2 ? -4 : 18}%` }}>{stamp}</span>
      ))}
    </div>
  )
}

function MobileTabs({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname()
  const { operations } = useNav()
  const { providers, orders, approvals, loading } = usePortal()
  const c = counts(providers, orders, approvals)

  return (
    <nav className="mtabs">
      {operations.map(i => {
        const active = pathname === i.href || pathname.startsWith(i.href + '/')
        const badge = loading ? null : i.key === 'activation' && c.urg
          ? <span className="badge">{c.urg}</span>
          : i.key === 'approvals' && c.apr
            ? <span className="badge" style={{ background: 'var(--indigo)' }}>{c.apr}</span>
            : null
        return (
          <Link key={i.key} href={i.href} className={active ? 'on' : undefined}>
            {badge}
            <NavIcon name={i.icon} />
            <span>{i.label}</span>
          </Link>
        )
      })}
      <button onClick={onMenu}>
        <MenuIcon size={17} />
        <span>More</span>
      </button>
    </nav>
  )
}

/** Pages whose content actually responds to the search term. */
const SEARCHABLE = ['/activation', '/clients', '/orders']

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { term, setTerm } = useFilters()
  const { openSheet, toast } = useUI()
  const [menuOpen, setMenuOpen] = useState(false)
  const meta = useMemo(() => {
    const key = Object.keys(PAGE_META)
      .filter(k => pathname === k || pathname.startsWith(k))
      .sort((a, b) => b.length - a.length)[0]
    return (key && PAGE_META[key]) || { t: 'Portal', s: '' }
  }, [pathname])

  // Copy / context-menu / drag suppression, per the design's no-export
  // stance. Scoped to this shell so it never leaks onto the login page.
  useEffect(() => {
    const block = (e: Event) => { e.preventDefault() }
    const onCopy = (e: Event) => { e.preventDefault(); toast('Copying is turned off on this screen.') }
    document.addEventListener('copy', onCopy)
    document.addEventListener('contextmenu', block)
    document.addEventListener('dragstart', block)
    return () => {
      document.removeEventListener('copy', onCopy)
      document.removeEventListener('contextmenu', block)
      document.removeEventListener('dragstart', block)
    }
  }, [toast])

  // Typing anywhere sends you to a list that can show results.
  const onSearch = (value: string) => {
    setTerm(value)
    if (value.trim() && !SEARCHABLE.some(r => pathname.startsWith(r))) {
      router.push('/activation')
    }
  }

  const mobileMenu = () => openSheet(<MobileMenuSheet />)

  const mobileSearch = () => openSheet(
    <>
      <h3>Search</h3>
      <input
        autoFocus
        type="search"
        placeholder="Name, email, phone…"
        defaultValue={term}
        onChange={e => onSearch(e.target.value)}
        style={{
          width: '100%', height: 48, padding: '0 14px', border: '1px solid var(--line)',
          borderRadius: 11, background: 'var(--paper)', fontSize: 15,
        }}
      />
      <p className="sub" style={{ margin: '10px 4px 0' }}>Filters the list as you type.</p>
    </>,
  )

  return (
    <>
      <div className="shell">
        {/* Desktop sidebar. On mobile the CSS hides .side entirely and the
            bottom tab bar takes over, matching the design. */}
        <Sidebar onNavigate={() => setMenuOpen(false)} />

        <main className="main">
          <div className="mtop">
            <button className="iconbtn" aria-label="Open menu" onClick={mobileMenu}>
              <MenuIcon />
            </button>
            <span className="mt">{meta.t}</span>
            <button className="iconbtn" aria-label="Search" onClick={mobileSearch}>
              <SearchIcon size={20} strokeWidth={2} />
            </button>
          </div>

          <header className="top">
            <div className="top-row">
              <div>
                <h1>{meta.t}</h1>
                <p className="sub">{meta.s}</p>
              </div>
              <div className="top-act">
                <div className="search">
                  <SearchIcon />
                  <input
                    type="search"
                    placeholder="Search client, email, phone…"
                    autoComplete="off"
                    value={term}
                    onChange={e => onSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </header>

          <div className="wrap">{children}</div>
        </main>
      </div>

      {/* <Watermark /> — removed on request; see the Watermark component above */}
      <MobileTabs onMenu={mobileMenu} />
      <DrawerHost />
      <SheetHost />
      <Toast />
    </>
  )
}

/** The mobile "More" sheet — full nav plus the alert shortcuts. */
function MobileMenuSheet() {
  const { operations, team, tools, c } = useNav()
  const { goWithAlert } = useFilters()
  const { closeSheet } = useUI()

  const item = (label: string, href: string, icon: string, count?: number | null) => (
    <Link key={href} href={href} className="opt" onClick={closeSheet}>
      <NavIcon name={icon} />
      <span className="grow">{label}</span>
      {count != null && count !== 0 ? <span className="n">{count}</span> : null}
    </Link>
  )

  return (
    <>
      <h3>Menu</h3>
      {operations.map(i => item(i.label, i.href, i.icon, i.count))}

      <p className="sdiv">Alerts</p>
      <button className="opt" onClick={() => { goWithAlert('/activation', 'urg'); closeSheet() }}>
        <NavIcon name="alert" />
        <span className="grow">Closing in ≤5 days</span>
        <span className="n" style={{ color: 'var(--clay)', fontWeight: 700 }}>{c.urg}</span>
      </button>
      <button className="opt" onClick={() => { goWithAlert('/activation', 'dead'); closeSheet() }}>
        <NavIcon name="clock" />
        <span className="grow">Expired accounts</span>
        <span className="n">{c.dead}</span>
      </button>
      <button className="opt" onClick={() => { goWithAlert('/activation', 'norep'); closeSheet() }}>
        <NavIcon name="userx" />
        <span className="grow">No rep assigned</span>
        <span className="n">{c.norep}</span>
      </button>

      <p className="sdiv">Team</p>
      {team.map(i => item(i.label, i.href, i.icon))}

      {tools.length > 0 && (
        <>
          <p className="sdiv">Tools</p>
          {tools.map(i => item(i.label, i.href, i.icon))}
        </>
      )}
    </>
  )
}
