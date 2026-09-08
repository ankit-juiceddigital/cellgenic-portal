'use client'
// File: src/components/ui/Sheet.tsx
//
// The bottom sheet. Used for: mobile menu, mobile search, the rep
// picker, and a row's overflow (⋯) actions.

import { useUI } from '@/lib/ui-context'
import { usePortal } from '@/hooks/usePortal'
import { useAuth } from '@/lib/auth-context'
import { addDays, fmt, initials, maskPhone, STAGE } from '@/lib/portal-model'
import type { Provider, Rep } from '@/types/portal'

export function SheetHost() {
  const { sheet, closeSheet, closeAll } = useUI()
  const open = Boolean(sheet)
  return (
    <>
      {/* The scrim is shared with the drawer; clicking it closes whatever
          is open. Rendered here too so a sheet opened without a drawer
          still dims the page. */}
      <div className={`scrim ${open ? 'on' : ''}`} onClick={closeAll} style={{ zIndex: 75 }} />
      <div className={`sheet ${open ? 'on' : ''}`}>
        <div className="grab" onClick={closeSheet} />
        <div>{sheet}</div>
      </div>
    </>
  )
}

/**
 * Rep picker. Shows how many in-window accounts each rep already owns,
 * so a bulk assignment isn't made blind — that count is the design's,
 * and it is real here.
 */
export function RepPickerSheet({
  ids, repNames, reps, onPick,
}: {
  ids: number[]
  repNames: string[]
  reps: Rep[]
  onPick: (repCode: string, repName: string | null) => Promise<void> | void
}) {
  const { providers } = usePortal()
  const { closeSheet } = useUI()

  const codeFor = (name: string) => reps.find(r => r.name === name)?.repCode || ''

  return (
    <>
      <h3>{ids.length > 1 ? `Assign ${ids.length} accounts to…` : 'Assign rep'}</h3>
      {repNames.map(r => {
        const load = providers.filter(x => x.rep === r && x.orders === 0).length
        const code = codeFor(r)
        return (
          <button
            key={r}
            className="opt"
            disabled={!code}
            onClick={async () => { await onPick(code, r); closeSheet() }}
          >
            <span className="av">{initials(r)}</span>
            <span className="grow">
              {r}
              <small>{code ? `${load} accounts in window` : 'No rep code set — cannot be assigned'}</small>
            </span>
          </button>
        )
      })}
      <button
        className="opt"
        onClick={async () => { await onPick('', null); closeSheet() }}
      >
        <span className="grow" style={{ color: 'var(--muted)' }}>Remove assignment</span>
      </button>
    </>
  )
}

/** The ⋯ overflow sheet on a table row. */
export function RowActionsSheet({ x }: { x: Provider }) {
  const { openDrawer, openSheet, closeSheet, toast } = useUI()
  const {
    advanceStage, extend, reveal, revealed, repNames, reps, assignRep,
    deactivateAccount, reactivateAccount,
  } = usePortal()
  const { isAdmin, isManager } = useAuth()
  const shown = revealed.has(x.id)
  const canManageAccess = isAdmin || isManager
  const isDeactivated = x.accountStatus === 'deactivated'

  return (
    <>
      <h3>{x.n}</h3>

      <button className="opt" onClick={() => { closeSheet(); openDrawer({ kind: 'p', id: x.id }) }}>
        <span className="grow">View full profile</span>
      </button>

      <button
        className="opt"
        onClick={async () => {
          closeSheet()
          try { await advanceStage(x.id); toast(`${x.n}: ${STAGE[x.stage].act} logged.`) }
          catch (e: any) { toast(e.message || 'Could not update the stage.') }
        }}
      >
        <span className="grow">{STAGE[x.stage].act}</span>
      </button>

      <button
        className="opt"
        onClick={async () => {
          closeSheet()
          await extend([x.id], 15)
          toast('Window extended 15 days.')
        }}
      >
        <span className="grow">
          Extend window 15 days
          <small>{x.closes ? `New close date: ${fmt(addDays(x.closes, 15))}` : 'No access date recorded'}</small>
        </span>
      </button>

      {x.extendedDays > 0 && (
        <button
          className="opt"
          onClick={async () => {
            closeSheet()
            const undo = Math.min(15, x.extendedDays)
            await extend([x.id], -undo)
            toast(`${undo} day${undo === 1 ? '' : 's'} removed from the window.`)
          }}
        >
          <span className="grow">
            Undo extension
            <small>
              Currently extended by {x.extendedDays} day{x.extendedDays === 1 ? '' : 's'}
              {x.closes ? ` · back to ${fmt(addDays(x.closes, -Math.min(15, x.extendedDays)))}` : ''}
            </small>
          </span>
        </button>
      )}

      <button
        className="opt"
        onClick={() => openSheet(
          <RepPickerSheet
            ids={[x.id]}
            repNames={repNames}
            reps={reps}
            onPick={async (code, name) => {
              await assignRep([x.id], code, name)
              toast(code ? `Assigned to ${name}.` : 'Assignment removed.')
            }}
          />,
        )}
      >
        <span className="grow">
          {x.rep ? 'Change rep' : 'Assign rep'}
          <small>{x.rep || 'Unassigned'}</small>
        </span>
      </button>

      <button
        className="opt"
        onClick={() => {
          if (!shown) { toast('Show the contact first — reveals are logged.'); return }
          closeSheet()
          window.open(`https://wa.me/${x.p.replace(/[^\d]/g, '')}`, '_blank', 'noopener')
        }}
      >
        <span className="grow">
          Open WhatsApp
          <small>{shown ? x.p : maskPhone(x.p)}</small>
        </span>
      </button>

      {!shown && (
        <button
          className="opt"
          onClick={async () => {
            closeSheet()
            await reveal(x.id)
            toast('Contact shown — the reveal is logged.')
          }}
        >
          <span className="grow">
            Show phone and email
            <small>Logged with your name and the time</small>
          </span>
        </button>
      )}

      {/*
        Blocks portal login — separate from the 30-day window/stage
        above (that "Reactivate account" is about the window; this is
        about access). Restricted to admin/manager since it locks
        someone out, same bar as other account-access actions.
      */}
      {canManageAccess && (
        isDeactivated ? (
          <button
            className="opt"
            onClick={async () => {
              closeSheet()
              try {
                await reactivateAccount(x.id)
                toast(`${x.n}: account reactivated — they can log in again.`)
              } catch (e: any) {
                toast(e.message || 'Could not reactivate the account.')
              }
            }}
          >
            <span className="grow">
              Reactivate account
              <small>Restores portal login</small>
            </span>
          </button>
        ) : (
          <button
            className="opt"
            onClick={async () => {
              closeSheet()
              if (!confirm(`Deactivate ${x.n}'s account? They will not be able to log in or place orders until reactivated.`)) return
              try {
                await deactivateAccount(x.id)
                toast(`${x.n}: account deactivated.`)
              } catch (e: any) {
                toast(e.message || 'Could not deactivate the account.')
              }
            }}
          >
            <span className="grow" style={{ color: 'var(--clay)' }}>
              Deactivate account
              <small style={{ color: 'var(--clay)', opacity: 0.75 }}>Blocks portal login — needs confirmation</small>
            </span>
          </button>
        )
      )}
    </>
  )
}
