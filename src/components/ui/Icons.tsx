// File: src/components/ui/Icons.tsx
// SVG paths lifted verbatim from the prototype's ICONS map so the nav
// glyphs are identical. lucide-react is deliberately NOT used for these
// — its icons are a different weight and the sidebar would read wrong.

export const NAV_ICONS: Record<string, string> = {
  overview: '<rect x="3" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6"/>',
  activation: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  clients: '<circle cx="9" cy="8" r="3.4"/><path d="M2.8 20a6.2 6.2 0 0112.4 0"/><path d="M17 8.6a3 3 0 010 4.8"/>',
  orders: '<path d="M3 7.2l9-4.2 9 4.2v9.6l-9 4.2-9-4.2z"/><path d="M3 7.2l9 4.2 9-4.2M12 11.4v9.6"/>',
  approvals: '<path d="M6.5 4h11a1.5 1.5 0 011.5 1.5v14A1.5 1.5 0 0117.5 21h-11A1.5 1.5 0 015 19.5v-14A1.5 1.5 0 016.5 4z"/><path d="M9 13l2 2 4-4"/>',
  reps: '<circle cx="12" cy="8" r="3.6"/><path d="M5 20a7 7 0 0114 0"/>',
  leaderboard: '<path d="M8 21h8M12 17v4M17 4v5a5 5 0 01-10 0V4z"/><path d="M17 5h3v2a3 3 0 01-3 3M7 5H4v2a3 3 0 003 3"/>',
  alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17h.01"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  userx: '<circle cx="10" cy="8" r="3.4"/><path d="M3.5 20a6.5 6.5 0 0113 0"/><path d="M17.5 8.5l3 3M20.5 8.5l-3 3"/>',
  // Added for the pages the prototype didn't cover but the live portal has
  inventory: '<path d="M3 8.5h18v11.5H3z"/><path d="M3 8.5L5 4h14l2 4.5M12 8.5V20"/>',
  calculator: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h2M12 12h2M16 12h.01M8 16h2M12 16h2M16 16h.01"/>',
  referral: '<path d="M9.5 13.5a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-.7.7"/><path d="M14.5 10.5a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l.7-.7"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-2.9 1.2 2 2 0 11-4 0 1.7 1.7 0 00-2.9-1.2l-.1.1a2 2 0 11-2.8-2.8l.1-.1A1.7 1.7 0 003 15a2 2 0 010-4 1.7 1.7 0 001.2-2.9l-.1-.1a2 2 0 112.8-2.8l.1.1A1.7 1.7 0 0010 4.6a2 2 0 014 0 1.7 1.7 0 002.9 1.2l.1-.1a2 2 0 112.8 2.8l-.1.1A1.7 1.7 0 0021 11a2 2 0 010 4z"/>',
}

/** The `.ico` class is what the sidebar CSS styles — keep it. */
export function NavIcon({ name, size = 17 }: { name: string; size?: number }) {
  const d = NAV_ICONS[name]
  if (!d) return null
  return (
    <svg
      className="ico"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: d }}
    />
  )
}

export const ChevronDown = ({ className = 'chev' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
    <path d="M6 9l6 6 6-6" />
  </svg>
)

export const ChevronRight = ({ size = 17, className = 'arw' }: { size?: number; className?: string }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 6l6 6-6 6" />
  </svg>
)

export const ChevronLeft = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
    <path d="M15 18l-6-6 6-6" />
  </svg>
)

export const SearchIcon = ({ size = 14, strokeWidth = 2.2 }: { size?: number; strokeWidth?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </svg>
)

export const MenuIcon = ({ size = 21 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M3 6h18M3 12h18M3 18h18" />
  </svg>
)

export const CheckIcon = ({ size = 11 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
    <path d="M20 6L9 17l-5-5" />
  </svg>
)

export const LockIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="4" y="10.5" width="16" height="10" rx="2" />
    <path d="M8 10.5V7a4 4 0 018 0v3.5" />
  </svg>
)
