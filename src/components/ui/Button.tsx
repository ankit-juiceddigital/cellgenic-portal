import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'ghost'
  size?: 'sm' | 'md'
}

export function Button({
  variant = 'default',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border font-medium transition-colors cursor-pointer',
        size === 'md' && 'px-3.5 py-1.5 text-sm',
        size === 'sm' && 'px-2.5 py-1 text-xs',
        variant === 'default' && 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
        variant === 'primary' && 'border-brand bg-brand text-white hover:bg-brand-dark',
        variant === 'ghost' && 'border-transparent bg-transparent text-gray-500 hover:bg-gray-100',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
