// File: src/components/ui/Ticks.tsx
//
// The 30-tick window bar. Lives on its own because both the table row
// and the drawer render it, and pulling it out of Drawer.tsx stops the
// table from importing the whole drawer tree.

import { ticks, tickTone } from '@/lib/portal-model'
import type { Provider } from '@/types/portal'

export function Ticks({ x }: { x: Provider }) {
  return (
    <div className={`ticks ${tickTone(x)}`} aria-hidden="true">
      {ticks(x).map((t, i) => (
        <i key={i} className={`${t.filled ? 'f' : ''} ${t.now ? 'now' : ''}`} />
      ))}
    </div>
  )
}
