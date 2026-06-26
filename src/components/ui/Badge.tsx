import { cn, badgeClass } from '@/lib/utils'

interface BadgeProps {
  variant: 'teal' | 'amber' | 'green' | 'red' | 'gray' | 'blue'
  children: React.ReactNode
  className?: string
}

export function Badge({ variant, children, className }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      badgeClass(variant),
      className
    )}>
      {children}
    </span>
  )
}
