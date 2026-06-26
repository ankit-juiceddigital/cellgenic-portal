// File: src/components/ui/Skeleton.tsx

import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse bg-gray-100 rounded-lg', className)} />
  )
}

export function MetricsSkeleton() {
  return (
    <div className="grid grid-cols-4 gap-3 mb-6">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-20" />
      ))}
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="border-b border-gray-100 px-4 py-3 flex gap-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="px-4 py-3.5 border-b border-gray-50 flex gap-4 items-center">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
      <p className="text-sm text-red-600 mb-3">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs text-red-600 underline hover:no-underline"
        >
          Try again
        </button>
      )}
    </div>
  )
}
