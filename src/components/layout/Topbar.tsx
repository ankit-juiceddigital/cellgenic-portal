import { ReactNode } from 'react'

interface TopbarProps {
  title: string
  subtitle?: string
  actions?: ReactNode
}

export function Topbar({ title, subtitle, actions }: TopbarProps) {
  return (
    <div className="bg-white border-b border-gray-100 px-4 py-3 md:px-7 md:py-3.5 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-10">
      <div className="min-w-0">
        <h1 className="text-base font-semibold text-gray-900 truncate">{title}</h1>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  )
}
