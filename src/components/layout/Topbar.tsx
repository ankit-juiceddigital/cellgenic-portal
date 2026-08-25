import { ReactNode } from 'react'

interface TopbarProps {
  title: string
  subtitle?: string
  actions?: ReactNode
}

export function Topbar({ title, subtitle, actions }: TopbarProps) {
  return (
    <div className="bg-white border-b border-gray-100 px-4 py-3 sm:px-5 lg:px-6 xl:px-7 xl:py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 xl:sticky xl:top-0 z-10">
      <div className="min-w-0 w-full sm:w-auto">
        <h1 className="text-base font-semibold text-gray-900 truncate">{title}</h1>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="w-full sm:w-auto flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  )
}
