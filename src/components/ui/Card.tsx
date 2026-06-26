import { cn } from '@/lib/utils'

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

export function MetricCard({
  label,
  value,
  delta,
  deltaType = 'positive',
}: {
  label: string
  value: string
  delta?: string
  deltaType?: 'positive' | 'negative' | 'neutral'
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
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
    </div>
  )
}
