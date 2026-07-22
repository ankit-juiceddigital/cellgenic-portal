import { cn } from '@/lib/utils'
import Link from 'next/link'

interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: boolean
}

export function Card({ children, className, padding = false }: CardProps) {
  return (
    <div className={cn(
      'bg-white rounded-xl border border-gray-200 overflow-hidden',
      padding && 'p-5',
      className
    )}>
      {children}
    </div>
  )
}

// ─────────────────────────────────────────────
// METRIC CARD
// When `href` (or `onClick`) is provided, the whole card becomes clickable
// and drills into the underlying records (e.g. "Total Providers" -> /clients).
// Falls back to a plain <div> when neither is given so existing usages
// keep working unchanged.
// ─────────────────────────────────────────────
export function MetricCard({
  label,
  value,
  delta,
  deltaType = 'positive',
  href,
  onClick,
}: {
  label: string
  value: string
  delta?: string
  deltaType?: 'positive' | 'negative' | 'neutral'
  href?: string
  onClick?: () => void
}) {
  const isInteractive = Boolean(href || onClick)

  const content = (
    <>
      <p className="text-xs text-gray-500 mb-1.5">{label}</p>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
      {delta && (
        <p className={cn(
          'text-xs mt-1',
          deltaType === 'positive' && 'text-emerald-600',
          deltaType === 'negative' && 'text-red-500',
          deltaType === 'neutral' && 'text-gray-400',
        )}>
          {delta}
        </p>
      )}
    </>
  )

  const classes = cn(
    'bg-gray-50 rounded-lg p-4 text-left w-full block',
    isInteractive && 'transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-brand/40 cursor-pointer'
  )

  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    )
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classes}>
        {content}
      </button>
    )
  }

  return <div className={classes}>{content}</div>
}
