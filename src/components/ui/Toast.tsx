'use client'
// File: src/components/ui/Toast.tsx

import { useUI } from '@/lib/ui-context'

export function Toast() {
  const { toastMessage } = useUI()
  return (
    <div className={`toast ${toastMessage ? 'on' : ''}`} role="status" aria-live="polite">
      {toastMessage}
    </div>
  )
}
