'use client'
// File: src/components/ui/Drawer.tsx
//
// The single drawer instance, plus the four record renderers. Structure
// (dr-h / dr-back / dr-t / dr-c / dr-a / dr-b, kv, sec-h, tl, mini) is
// the design's markup unchanged — only the data behind it is live.

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useFilters } from '@/lib/filter-context'
import { useUI } from '@/lib/ui-context'
import { usePortal } from '@/hooks/usePortal'
import * as api from '@/lib/api'
import {
  dayDiff, flag, fmt, maskEmail, maskPhone, money,
  orderStatus, repStats, STAGE, today, WINDOW_DAYS,
} from '@/lib/portal-model'
import type { Provider } from '@/types/portal'
import { ChevronLeft } from '@/components/ui/Icons'
import { RepPickerSheet } from '@/components/ui/Sheet'
import { Ticks } from '@/components/ui/Ticks'

export function DrawerHost() {
  const { drawer, stack, drawerBack, closeDrawer, closeAll } = useUI()
  const open = Boolean(drawer)

  return (
    <>
      <div className={`scrim ${open ? 'on' : ''}`} onClick={closeAll} />
      <aside className={`drawer ${open ? 'on' : ''}`} role="dialog" aria-modal="true">
        {drawer && (
          <DrawerContent
            back={stack.length ? { label: stack[stack.length - 1].label, onBack: drawerBack } : null}
            onClose={closeDrawer}
          />
        )}
      </aside>
    </>
  )
}

function DrawerContent({
  back, onClose,
}: {
  back: { label: string; onBack: () => void } | null
  onClose: () => void
}) {
  const { drawer } = useUI()
  if (!drawer) return null

  const shell = (body: {
    name: string; sub: React.ReactNode; count: React.ReactNode; acts: React.ReactNode; main: React.ReactNode
  }) => (
    <>
      <div className="dr-h">
        {back && (
          <button className="dr-back" onClick={back.onBack}>
            <ChevronLeft />
            <span>Back to {back.label}</span>
          </button>
        )}
        <div className="dr-t">
          <div>
            <h2 className="dr-n">{body.name}</h2>
            <p className="dr-s">{body.sub}</p>
          </div>
          <button className="iconbtn" aria-label="Close" onClick={onClose}>✕</button>
        </div>
        <div className="dr-c">{body.count}</div>
        <div className="dr-a">{body.acts}</div>
      </div>
      <div className="dr-b">{body.main}</div>
    </>
  )

  if (drawer.kind === 'p') return <ProviderDrawer id={drawer.id} shell={shell} />
  if (drawer.kind === 'o') return <OrderDrawer id={drawer.id} shell={shell} />
  if (drawer.kind === 'a') return <ApprovalDrawer id={drawer.id} shell={shell} />
  return <RepDrawer id={drawer.id} shell={shell} />
}

type Shell = (b: {
  name: string; sub: React.ReactNode; count: React.ReactNode; acts: React.ReactNode; main: React.ReactNode
}) => JSX.Element

// ─────────────────────────────────────────────
// PROVIDER
// ─────────────────────────────────────────────
function ProviderDrawer({ id, shell }: { id: number; shell: Shell }) {
  const { user } = useAuth()
  const { byId, ordersFor, revealed, reveal, advanceStage, extend, repNames, assignRep, reps } = usePortal()
  const { openDrawer, openSheet, toast, closeDrawer } = useUI()
  const { setCountry, goWithAlert } = useFilters()
  const [events, setEvents] = useState<any[]>([])
  const [notes, setNotes] = useState<any[]>([])

  const x = byId(id)

  useEffect(() => {
    if (!user?.token || !x) return
    let dead = false
    api.getClientEvents(user.token, id).then(e => { if (!dead) setEvents(e || []) }).catch(() => {})
    api.getNotes(user.token, id).then(n => { if (!dead) setNotes(n || []) }).catch(() => {})
    return () => { dead = true }
  }, [user?.token, id, x])

  if (!x) return null

  const st = STAGE[x.stage]
  const shown = revealed.has(x.id)
  const ords = ordersFor(x.id)
  const frame = { ref: { kind: 'p' as const, id: x.id }, label: x.n }

  const count = x.orders > 0
    ? (
      <>
        <div className="r">
          <span style={{ color: 'var(--jade)', fontWeight: 500 }}>Active client</span>
          <b style={{ color: 'var(--jade)' }}>{money(x.rev)}</b>
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
          {x.orders} orders
          {x.acc && x.last ? ` · first order on day ${Math.max(1, dayDiff(x.acc, x.last))} of the window.` : '.'}
        </div>
      </>
    )
    : x.acc && x.left <= 0
      ? (
        <>
          <div className="r">
            <span style={{ color: 'var(--muted)' }}>Account closed</span>
            <b style={{ color: '#9B9FA5' }}>day {WINDOW_DAYS + x.extendedDays}</b>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            Expired {-x.left} days ago with no purchase.
          </div>
        </>
      )
      : (
        <>
          <div className="r">
            <span style={{ color: 'var(--muted)' }}>
              {x.closes ? `Closes on ${fmt(x.closes)}` : 'No access date recorded'}
            </span>
            <b style={{
              color: x.bucket === 'urg' ? 'var(--clay)' : x.bucket === 'warn' ? 'var(--amber)' : 'var(--ink)',
            }}>{x.left} days</b>
          </div>
          <Ticks x={x} />
        </>
      )

  const acts = (
    <>
      <button
        className="btn btn-sm btn-dark"
        onClick={async () => {
          const was = st.t
          try {
            await advanceStage(x.id)
            const now = byId(x.id)
            toast(x.stage === 'act'
              ? `Contact logged with ${x.n}.`
              : `${x.n}: ${was} → ${STAGE[now?.stage || x.stage].t}`)
          } catch (e: any) { toast(e.message || 'Could not update the stage.') }
        }}
      >{st.act}</button>
      <button
        className="btn btn-sm"
        onClick={() => {
          if (!shown) { toast('Show the contact first — reveals are logged.'); return }
          window.open(`https://wa.me/${x.p.replace(/[^\d]/g, '')}`, '_blank', 'noopener')
        }}
      >WhatsApp</button>
      <button
        className="btn btn-sm"
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
      >{x.rep ? 'Change rep' : 'Assign rep'}</button>
      <button
        className="btn btn-sm"
        onClick={async () => {
          await extend([x.id], 15)
          toast('Window extended 15 days. Undo it from the profile below.')
        }}
      >Extend 15 days</button>
      {/* The full profile page still owns notes, DocuSign consent and the
          place-order form, so the drawer links to it rather than
          duplicating them. */}
      <Link
        className="btn btn-sm"
        href={`/clients/${x.id}`}
        style={{ gridColumn: '1 / -1' }}
        onClick={closeDrawer}
      >
        Open full profile →
      </Link>
    </>
  )

  const main = (
    <>
      <dl className="kv">
        <dt>Access granted</dt>
        <dd className="mono">
          {x.acc ? fmt(x.acc) : '—'}
        </dd>
        <dt>Closes on</dt>
        <dd className="mono">{x.orders > 0 ? '—' : x.closes ? fmt(x.closes) : '—'}</dd>
        {x.extendedDays > 0 && (
          <>
            <dt>Extended by</dt>
            <dd>
              <span className="mono">{x.extendedDays} day{x.extendedDays === 1 ? '' : 's'}</span>
              <button
                className="rev"
                onClick={async () => {
                  const undo = Math.min(15, x.extendedDays)
                  await extend([x.id], -undo)
                  toast(`${undo} day${undo === 1 ? '' : 's'} removed from ${x.n}'s window.`)
                }}
              >Undo {Math.min(15, x.extendedDays)}d</button>
              {x.extendedDays > 15 && (
                <button
                  className="rev"
                  onClick={async () => {
                    await extend([x.id], -x.extendedDays)
                    toast(`All extensions removed from ${x.n}'s window.`)
                  }}
                >Clear all</button>
              )}
            </dd>
          </>
        )}
        <dt>Last order</dt>
        <dd>{x.last
          ? <><span className="mono">{fmt(x.last)}</span> · {dayDiff(x.last, today())} d ago</>
          : <span className="never">Never</span>}</dd>
        <dt>Orders</dt><dd className="mono">{x.orders}</dd>
        <dt>Billed</dt><dd className="mono">{money(x.rev)}</dd>
        <dt>Clinic</dt><dd>{x.clinic || '—'}</dd>
        <dt>Rep</dt>
        <dd>{x.rep
          ? (
            <button onClick={() => {
              const r = reps.find(rr => rr.name === x.rep)
              if (r) openDrawer({ kind: 'r', id: r.id }, frame)
              else { goWithAlert('/activation'); toast(`Accounts for ${x.rep}`) }
            }}>{x.rep}</button>
          )
          : <span className="never">Unassigned</span>}</dd>
        <dt>Country</dt>
        <dd><button onClick={() => { setCountry(x.c); goWithAlert('/activation'); }}>{flag(x.cc)} {x.c}</button></dd>
        <dt>Email</dt>
        <dd className="nosel">{shown
          ? x.e
          : <><span className="masked">{maskEmail(x.e)}</span>
              <button className="rev" onClick={() => reveal(x.id).then(() => toast('Contact shown — the reveal is logged.'))}>Show</button></>}</dd>
        <dt>Phone</dt>
        <dd className="nosel">{shown
          ? <span className="mono">{x.p}</span>
          : <><span className="masked">{maskPhone(x.p)}</span>
              <button className="rev" onClick={() => reveal(x.id).then(() => toast('Contact shown — the reveal is logged.'))}>Show</button></>}</dd>
      </dl>

      {ords.length > 0 && (
        <>
          <p className="sec-h">Orders ({ords.length})</p>
          <div className="mini">
            {ords.map(o => (
              <button key={o.id} onClick={() => openDrawer({ kind: 'o', id: o.id }, frame)}>
                <span className="g">
                  <b>Order {o.number}</b>
                  <span>{fmt(o.date)} · {orderStatus(o.status).t}</span>
                </span>
                <span className="mono" style={{ fontWeight: 600 }}>{money(o.total)}</span>
              </button>
            ))}
          </div>
        </>
      )}

      <p className="sec-h">Timeline</p>
      <div className="tl">
        {/* Real events first — these are recorded server-side. The
            prototype's timeline was invented copy; anything not actually
            logged is now shown as "not logged" rather than asserted. */}
        {x.orders > 0 && x.last && (
          <div className="ev hot">Most recent order<time>{fmt(x.last)}</time></div>
        )}
        {notes.slice(0, 4).map((nt: any) => (
          <div className="ev" key={nt.id}>{nt.text}<time>{nt.date} · {nt.author}</time></div>
        ))}
        {events.slice(0, 6).map((ev: any, k: number) => (
          <div className="ev" key={`e${k}`}>{ev.note}<time>{ev.at} · {ev.by}</time></div>
        ))}
        {x.acc
          ? <div className="ev">Access granted<time>{fmt(x.acc)}</time></div>
          : <div className="ev">No access date recorded<time>backfill pending</time></div>}
        {!notes.length && !events.length && x.orders === 0 && (
          <div className="ev">No contact logged<time>{x.elapsed} days with no activity</time></div>
        )}
      </div>
    </>
  )

  return shell({
    name: x.n,
    sub: <>{flag(x.cc)} {x.c} <span className={`pill ${st.k}`}>{st.t}</span>{x.vip ? <span className="tag">VIP</span> : null}</>,
    count, acts, main,
  })
}

// ─────────────────────────────────────────────
// ORDER
// ─────────────────────────────────────────────
function OrderDrawer({ id, shell }: { id: number; shell: Shell }) {
  const { orders, byId } = usePortal()
  const { openDrawer, toast } = useUI()
  const o = orders.find(x => x.id === id)
  if (!o) return null

  const client = byId(o.customerId)
  const stat = orderStatus(o.status)
  const frame = { ref: { kind: 'o' as const, id: o.id }, label: `Order ${o.number}` }

  return shell({
    name: `Order ${o.number}`,
    sub: <>{fmt(o.date)} <span className={`pill ${stat.k}`}>{stat.t}</span></>,
    count: (
      <>
        <div className="r">
          <span style={{ color: 'var(--muted)' }}>Order total</span>
          <b>{money(o.total)}</b>
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
          {o.items.length} products · {o.itemCount} units
          {o.placedBy ? ` · placed by ${o.placedBy}` : ''}
        </div>
      </>
    ),
    acts: (
      <>
        <button className="btn btn-sm btn-dark" onClick={() => toast('Invoice generation is not wired up yet.')}>Invoice</button>
        <button className="btn btn-sm" onClick={() => toast('Status changes are made in WooCommerce.')}>Update status</button>
        {client && (
          <button className="btn btn-sm" onClick={() => openDrawer({ kind: 'p', id: client.id }, frame)}>
            View client
          </button>
        )}
      </>
    ),
    main: (
      <>
        <dl className="kv">
          <dt>Client</dt>
          <dd>{client
            ? <button onClick={() => openDrawer({ kind: 'p', id: client.id }, frame)}>{o.customerName}</button>
            : o.customerName}</dd>
          <dt>Date</dt><dd className="mono">{fmt(o.date)}</dd>
          <dt>Status</dt><dd>{stat.t}</dd>
          <dt>Payment</dt><dd>{o.paymentMethod || '—'}</dd>
          <dt>Shipping</dt><dd>{o.shippingMethod || '—'}</dd>
          <dt>Placed by</dt><dd>{o.placedBy || 'Client'}</dd>
          <dt>Total</dt><dd className="mono">{money(o.total)}</dd>
        </dl>

        <p className="sec-h">Products</p>
        <div className="mini">
          {o.items.map((it, k) => (
            <div className="mrow" key={k}>
              <span className="g">
                <b>{it.name}</b>
                <span>{it.quantity} × {money(it.unitPrice)}{it.sku ? ` · ${it.sku}` : ''}</span>
              </span>
              <span className="mono" style={{ fontWeight: 600 }}>{money(it.lineTotal)}</span>
            </div>
          ))}
          {o.shippingCost > 0 && (
            <div className="mrow">
              <span className="g"><b>{o.shippingMethod || 'Shipping'}</b></span>
              <span className="mono">{money(o.shippingCost)}</span>
            </div>
          )}
          <div className="mrow">
            <span className="g"><b>Total</b></span>
            <span className="mono" style={{ fontWeight: 700 }}>{money(o.total)}</span>
          </div>
        </div>
      </>
    ),
  })
}

// ─────────────────────────────────────────────
// APPROVAL
// ─────────────────────────────────────────────
function ApprovalDrawer({ id, shell }: { id: number; shell: Shell }) {
  const { approvals, approve, reject, busy } = usePortal()
  const { toast, closeDrawer } = useUI()
  const [shown, setShown] = useState(false)
  const a = approvals.find(x => x.id === id)
  if (!a) return null

  return shell({
    name: a.n,
    sub: <>{a.c} <span className="pill p-new">Pending</span></>,
    count: (
      <>
        <div className="r">
          <span style={{ color: 'var(--muted)' }}>Requested access</span>
          <b style={{ fontSize: 14 }}>{fmt(a.req)}</b>
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{a.note}</div>
      </>
    ),
    acts: (
      <>
        <button
          className="btn btn-sm btn-dark"
          disabled={busy === a.id}
          onClick={async () => {
            await approve(a.id)
            closeDrawer()
            toast(`${a.n} now has access. Their 30-day window starts today.`)
          }}
        >{busy === a.id ? 'Working…' : 'Grant access'}</button>
        <button
          className="btn btn-sm"
          disabled={busy === a.id}
          onClick={async () => {
            await reject(a.id)
            closeDrawer()
            toast(`${a.n}'s request rejected.`)
          }}
        >Reject</button>
        {a.docUrl && (
          <a className="btn btn-sm" href={a.docUrl} target="_blank" rel="noopener noreferrer">View document</a>
        )}
        <button className="btn btn-sm" onClick={() => setShown(true)}>Show contact</button>
      </>
    ),
    main: (
      <>
        <dl className="kv">
          <dt>Country</dt><dd>{a.c}</dd>
          <dt>Email</dt>
          <dd className="nosel">{shown ? a.e : <><span className="masked">{maskEmail(a.e)}</span><button className="rev" onClick={() => setShown(true)}>Show</button></>}</dd>
          <dt>Phone</dt>
          <dd className="nosel">{shown ? <span className="mono">{a.p}</span> : <><span className="masked">{maskPhone(a.p)}</span><button className="rev" onClick={() => setShown(true)}>Show</button></>}</dd>
          <dt>Role</dt><dd>{a.providerRole || '—'}</dd>
          <dt>Experience</dt><dd>{a.years || '—'}</dd>
          <dt>Patient volume</dt><dd>{a.volume || '—'}</dd>
          <dt>Practice</dt><dd>{a.setup || '—'}</dd>
          <dt>Pillars</dt><dd>{a.pillars || '—'}</dd>
          <dt>Investment</dt><dd>{a.investment || '—'}</dd>
          <dt>Referral</dt><dd>{a.referralCode || <span className="never">None (unclaimed)</span>}</dd>
          <dt>Documents</dt><dd>{a.doc}</dd>
        </dl>

        {a.message && (
          <>
            <p className="sec-h">Their message</p>
            <p style={{ fontSize: 13, lineHeight: 1.55, margin: '0 0 20px' }}>{a.message}</p>
          </>
        )}

        <p className="sec-h">What happens on approval</p>
        <div className="tl">
          <div className="ev hot">Access granted · 30-day window starts today<time>day 0</time></div>
          <div className="ev">
            {a.referralCode
              ? `Stays with the referring rep (${a.referralCode})`
              : 'Rep assigned automatically, round-robin'}
            <time>immediately</time>
          </div>
          <div className="ev">Welcome call due<time>day 1</time></div>
        </div>
      </>
    ),
  })
}

// ─────────────────────────────────────────────
// REP
// ─────────────────────────────────────────────
function RepDrawer({ id, shell }: { id: number; shell: Shell }) {
  const { reps, providers } = usePortal()
  const { openDrawer, toast } = useUI()
  const { setRep, goWithAlert } = useFilters()

  const rep = reps.find(r => r.id === id)
  if (!rep) return null
  const x = repStats(providers, rep.name, reps)
  const frame = { ref: { kind: 'r' as const, id }, label: rep.name }

  return shell({
    name: rep.name,
    sub: <>{rep.repCode ? <span className="mono">{rep.repCode}</span> : 'No rep code'} · {x.total} accounts assigned</>,
    count: (
      <>
        <div className="r">
          <span style={{ color: 'var(--muted)' }}>Attributed revenue</span>
          <b>{money(x.rev)}</b>
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
          Activation rate {x.rate}% · {x.act} of {x.total} accounts
          {x.urg ? <> · <b style={{ color: 'var(--clay)' }}>{x.urg} urgent</b></> : null}
        </div>
      </>
    ),
    acts: (
      <>
        <button
          className="btn btn-sm btn-dark"
          onClick={() => { setRep(rep.name); goWithAlert('/activation'); toast(`Accounts for ${rep.name}`) }}
        >View their accounts</button>
        <button className="btn btn-sm" onClick={() => toast('Daily summary emails are not wired up yet.')}>
          Send summary
        </button>
      </>
    ),
    main: (
      <>
        <dl className="kv">
          <dt>Email</dt><dd>{rep.email}</dd>
          <dt>Role</dt><dd>{rep.role.replace('_', ' ')}</dd>
          <dt>Orders (month)</dt><dd className="mono">{rep.ordersMonth}</dd>
          <dt>Revenue (month)</dt><dd className="mono">{rep.revenue}</dd>
          <dt>Trend</dt><dd className="mono">{rep.trend}</dd>
        </dl>

        <p className="sec-h">Accounts assigned ({x.total})</p>
        <div className="mini">
          {x.mine.length ? x.mine.map(m => (
            <button key={m.id} onClick={() => openDrawer({ kind: 'p', id: m.id }, frame)}>
              <span className="g">
                <b>{m.n}</b>
                <span>
                  {flag(m.cc)} {m.c} · {m.orders > 0
                    ? money(m.rev)
                    : m.left > 0 ? `${m.left} days to close` : 'expired account'}
                </span>
              </span>
              <span className={`pill ${STAGE[m.stage].k}`}>{STAGE[m.stage].t}</span>
            </button>
          )) : <div className="empty">No accounts assigned.</div>}
        </div>
      </>
    ),
  })
}
