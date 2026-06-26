import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function badgeClass(variant: 'teal' | 'amber' | 'green' | 'red' | 'gray' | 'blue') {
  const map = {
    teal: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-700',
    gray: 'bg-gray-100 text-gray-600',
    blue: 'bg-blue-100 text-blue-700',
  }
  return map[variant]
}

export function noteIconClass(type: string) {
  const map: Record<string, string> = {
    call: 'bg-blue-100 text-blue-600',
    email: 'bg-purple-100 text-purple-600',
    note: 'bg-gray-100 text-gray-500',
    followup: 'bg-amber-100 text-amber-600',
  }
  return map[type] || map.note
}

export function noteTagClass(type: string) {
  const map: Record<string, string> = {
    call: 'bg-blue-100 text-blue-700',
    email: 'bg-purple-100 text-purple-700',
    note: 'bg-gray-100 text-gray-600',
    followup: 'bg-amber-100 text-amber-700',
  }
  return map[type] || map.note
}

export function noteTagLabel(type: string) {
  const map: Record<string, string> = {
    call: 'Call',
    email: 'Email',
    note: 'Note',
    followup: 'Follow-up',
  }
  return map[type] || 'Note'
}
