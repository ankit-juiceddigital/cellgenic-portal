'use client'

// File: src/app/(portal)/clients/[id]/page.tsx
//
// Restyled onto the v2 design system — same tokens, same classes as
// Activation/Overview/the drawer (.panel, .kv, .mini, .tl, .pill, .tag,
// .stats, Ticks). Previously this page kept its own Tailwind "Card"
// look while everything around it (sidebar, header, drawer) had already
// moved to the new design, so opening a profile felt like a different
// product.
//
// Data sources, unchanged in nature but reassigned by purpose:
//   - usePortal().byId(id)   → the SAME enriched Provider the table,
//     the drawer and the sheet already use. Powers the header, the
//     30-day window summary, masking/reveal, stage, rep, VIP, and
//     lets this page use the exact same actions (advance stage, extend
//     window, assign rep, deactivate/reactivate) as everywhere else.
//   - usePortal().ordersFor(id) → the same order records the drawer
//     uses, so "Order history" here opens the SAME OrderDrawer instead
//     of a second, duplicate order-detail UI.
//   - useCustomer()/useUpdateCustomer() → kept, for the WordPress/WC
//     fields the portal-clients endpoint doesn't return: registration
//     city/state/country and full billing/shipping addresses, and for
//     editing them.
//   - useConsentStatus(), useNotes(), useProducts() → unchanged.
//
// Behaviour change worth flagging: order rows used to expand inline;
// they now open the shared order drawer, same as clicking an order
// anywhere else in the app. Ask if you'd rather keep the inline expand.

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { useUI } from '@/lib/ui-context'
import { usePortal } from '@/hooks/usePortal'
import {
  useCustomer, useUpdateCustomer, useConsentStatus, useProducts, useNotes,
} from '@/hooks/useData'
import { MultiProductOrderForm } from '@/components/MultiProductOrder'
import {
  accountStatusLabel, dayDiff, flag, fmt, isAwaitingAdminReview, maskEmail, maskPhone, money, orderStatus, STAGE, today,
} from '@/lib/portal-model'
import { ChevronLeft, ChevronRight } from '@/components/ui/Icons'
import { RepPickerSheet } from '@/components/ui/Sheet'
import { Ticks } from '@/components/ui/Ticks'
import type { Note } from '@/types'

// ─────────────────────────────────────────────
// DocuSign consent — same eligibility/logic as before, restyled.
// ─────────────────────────────────────────────
const ELIGIBLE_COUNTRIES = ['US', 'MX', 'United States', 'Mexico']

function ConsentButtons({
  clientId, customer, isActive, country,
}: {
  clientId: number
  customer: { name: string; email: string; country: string } | null
  isActive: boolean
  country: string | null
}) {
  const { isAdmin } = useAuth()
  const { data: consentStatus, refetch: refetchConsent } = useConsentStatus(clientId) as {
    data: { research?: string | null; cosmetic?: string | null } | null
    refetch: () => void
  }
  const [sending, setSending] = useState<string | null>(null)
  const [sentThisSession, setSentThisSession] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)

  if (!isAdmin) return null
  if (!isActive) return null
  if (country && !ELIGIBLE_COUNTRIES.includes(country)) return null

  const statusFor = (formType: 'research' | 'cosmetic') =>
    consentStatus?.[formType] || (sentThisSession[formType] ? 'sent' : null)

  const sendConsent = async (formType: 'research' | 'cosmetic') => {
    if (!customer?.email) {
      setError('This client has no email on file yet, so the form cannot be sent.')
      return
    }
    setSending(formType)
    setError(null)
    try {
      const res = await fetch('/api/docusign/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId, clientName: customer.name, clientEmail: customer.email, formType,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSentThisSession(prev => ({ ...prev, [formType]: true }))
      refetchConsent()
    } catch (err: any) {
      setError(err.message || 'Failed to send consent form.')
    } finally {
      setSending(null)
    }
  }

  const row = (formType: 'research' | 'cosmetic', label: string) => {
    const status = statusFor(formType)
    const isSigned = status === 'signed'
    const isSent = status === 'sent'
    const isSending = sending === formType
    return (
      <div className="mrow" key={formType}>
        <span className="g">
          <b>{label}</b>
          <span>
            {isSigned ? 'Signed' : isSent ? 'Sent — awaiting signature' : 'Not sent yet'}
          </span>
        </span>
        {isSigned ? (
          <span className="pill p-act">Signed</span>
        ) : (
          <button className="btn btn-sm" disabled={isSending} onClick={() => sendConsent(formType)}>
            {isSending ? 'Sending…' : isSent ? 'Resend' : 'Send'}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="panel">
      <div className="panel-h"><h3>Consent forms</h3></div>
      {error && (
        <div style={{ margin: '12px 15px 0', color: 'var(--clay)', fontSize: 12.5 }}>{error}</div>
      )}
      <div className="mini" style={{ margin: 15, marginBottom: 15 }}>
        {row('research', 'Research Use Only Consent')}
        {row('cosmetic', 'Cosmetic Use Consent')}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Address block — plain .box, no card component needed for one static
// block of lines.
// ─────────────────────────────────────────────
function AddressBox({ title, address }: { title: string; address?: any }) {
  const lines = [
    [address?.first_name, address?.last_name].filter(Boolean).join(' '),
    address?.company,
    address?.address_1,
    address?.address_2,
    [address?.city, address?.state, address?.postcode].filter(Boolean).join(', '),
    address?.country,
  ].filter(Boolean)

  return (
    <div className="box">
      <div className="box-h">{title}</div>
      {lines.length > 0 ? (
        <div style={{ fontSize: 13, lineHeight: 1.6 }}>
          {lines.map((line, i) => <p key={i} style={{ margin: 0 }}>{line}</p>)}
          {address?.phone && <p style={{ margin: '8px 0 0', color: 'var(--muted)' }} className="mono">{address.phone}</p>}
          {address?.email && <p style={{ margin: 0, color: 'var(--muted)' }}>{address.email}</p>}
        </div>
      ) : (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>No address added yet.</p>
      )}
    </div>
  )
}

const emptyAddress = {
  first_name: '', last_name: '', company: '', address_1: '', address_2: '',
  city: '', state: '', postcode: '', country: '', email: '', phone: '',
}

// Note types map onto the design's existing pill tokens rather than new
// colours — call → contacted (indigo), email → quote (violet), note →
// neutral (slate), follow-up → needs-attention (amber).
const NOTE_META: Record<Note['type'], { label: string; cls: string }> = {
  call: { label: 'Call', cls: 'p-cont' },
  email: { label: 'Email', cls: 'p-quote' },
  note: { label: 'Note', cls: 'p-new' },
  followup: { label: 'Follow-up', cls: 'p-noresp' },
}

export default function ClientDetailPage({ params }: { params: { id: string } | Promise<{ id: string }> }) {
  const { isRep, isManager, isAdmin } = useAuth()
  const resolvedParams = typeof (params as any)?.then === 'function'
    ? use(params as Promise<{ id: string }>)
    : (params as { id: string })
  const clientId = parseInt(resolvedParams.id)

  const {
    byId, ordersFor, loadOrdersFor, isOrdersLoadingFor, isOrdersLoadedFor,
    loading: portalLoading, revealed, reveal,
    advanceStage, extend, assignRep, repNames, reps,
    deactivateAccount, reactivateAccount, busy,
  } = usePortal()
  const { openDrawer, openSheet, toast } = useUI()

  const x = byId(clientId)
  const shown = revealed.has(clientId)
  const ords = ordersFor(clientId)

  const { data: customer, loading: customerLoading, error: customerError, refetch: refetchCustomer } = useCustomer(clientId)
  const { save: saveCustomer, saving: savingCustomer, error: updateCustomerError } = useUpdateCustomer()
  const { notes, loading: notesLoading, addNote } = useNotes(clientId)
  const { data: products } = useProducts()

  const awaitingReview = x ? isAwaitingAdminReview(x.accountStatus) : false
  const isActive = x ? !['deactivated', 'awaiting_admin_review', 'rejected'].includes(x.accountStatus) : true
  const country = x?.c || customer?.country || null

  const [tab, setTab] = useState<'orders' | 'notes' | 'place'>('orders')
  const [noteText, setNoteText] = useState('')
  const [noteType, setNoteType] = useState<Note['type']>('note')
  const [saving, setSaving] = useState(false)
  const [noteError, setNoteError] = useState<string | null>(null)
  const [editingClient, setEditingClient] = useState(false)
  const [clientForm, setClientForm] = useState<any>(null)
  const [clientSaved, setClientSaved] = useState(false)

  useEffect(() => {
    if (!x || x.orders <= 0 || isOrdersLoadedFor(clientId) || isOrdersLoadingFor(clientId)) return
    loadOrdersFor(clientId).catch(() => {})
  }, [x, clientId, loadOrdersFor, isOrdersLoadedFor, isOrdersLoadingFor])

  const canPlaceOrder = (isRep || isManager || isAdmin) && !awaitingReview
  const canManageAccess = isAdmin || isManager

  const handleAddNote = async () => {
    if (!noteText.trim()) return
    setSaving(true)
    setNoteError(null)
    try {
      await addNote(noteText.trim(), noteType)
      setNoteText('')
    } catch (err: any) {
      setNoteError(err.message || 'Failed to save note. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const startEditingClient = () => {
    if (!customer) return
    setClientSaved(false)
    setClientForm({
      first_name: customer.first_name || '',
      last_name: customer.last_name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      clinic: customer.clinic || '',
      billing: { ...emptyAddress, ...(customer.billing || {}) },
      shipping: { ...emptyAddress, ...(customer.shipping || {}) },
    })
    setEditingClient(true)
  }

  const updateFormField = (field: string, value: string) =>
    setClientForm((prev: any) => ({ ...prev, [field]: value }))
  const updateAddressField = (type: 'billing' | 'shipping', field: string, value: string) =>
    setClientForm((prev: any) => ({ ...prev, [type]: { ...prev[type], [field]: value } }))

  const handleSaveClient = async () => {
    if (!clientForm) return
    setClientSaved(false)
    try {
      await saveCustomer(clientId, clientForm)
      await refetchCustomer()
      setEditingClient(false)
      setClientSaved(true)
    } catch {
      // surfaced via updateCustomerError below the form
    }
  }

  // Still loading the very first time — the portal-provider data and the
  // WordPress customer record load in parallel, independently.
  if (portalLoading && !x) {
    return <div className="panel"><div className="empty">Loading client…</div></div>
  }

  if (!x && !customerLoading) {
    return (
      <div className="panel">
        <div className="empty">
          <b>Client not found</b>
          Either the ID is wrong, or you don&rsquo;t have access to this account.
          <div style={{ marginTop: 14 }}>
            <Link className="btn btn-sm" href="/clients">Back to clients</Link>
          </div>
        </div>
      </div>
    )
  }

  const st = x ? STAGE[x.stage] : null

  return (
    <>
      <Link href="/clients" className="linkish" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
        <ChevronLeft size={12} /> Back to clients
      </Link>

      {/* ── Header: name, tags, window summary, quick actions ── */}
      {x && (
        <div className="panel" style={{ marginTop: 12 }}>
          <div className="panel-h">
            <h3 style={{ fontSize: 16.5, fontFamily: '"Bricolage Grotesque",sans-serif' }}>{x.n}</h3>
            <span className={`pill ${st!.k}`}>{st!.t}</span>
            {x.vip && <span className="tag">VIP</span>}
            {x.accountStatus === 'deactivated' && (
              <span className="tag" style={{ background: 'var(--clay-bg)', color: 'var(--clay)' }}>Deactivated</span>
            )}
            {awaitingReview && (
              <span className="tag" style={{ background: 'var(--amber-bg)', color: 'var(--amber)' }}>Awaiting admin review</span>
            )}
            {!editingClient && (
              <span className="r">
                <button className="btn btn-sm" onClick={startEditingClient}>Edit client information</button>
              </span>
            )}
          </div>

          <div style={{ padding: 15 }}>
            {/* Same window summary as the drawer's count block */}
            <div className="dr-c" style={{ marginBottom: 15 }}>
              {awaitingReview ? (
                <>
                  <div className="r">
                    <span style={{ color: 'var(--amber)', fontWeight: 500 }}>Awaiting admin review</span>
                    <b style={{ color: 'var(--amber)', fontSize: 14 }}>Pending</b>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    Access has not been granted yet. The 30-day window starts after approval.
                  </div>
                </>
              ) : x.orders > 0 ? (
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
              ) : x.acc && x.left <= 0 ? (
                <>
                  <div className="r">
                    <span style={{ color: 'var(--muted)' }}>Account closed</span>
                    <b style={{ color: '#9B9FA5' }}>expired</b>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>Expired {-x.left} days ago with no purchase.</div>
                </>
              ) : (
                <>
                  <div className="r">
                    <span style={{ color: 'var(--muted)' }}>{x.closes ? `Closes on ${fmt(x.closes)}` : 'No access date recorded'}</span>
                    <b style={{ color: x.bucket === 'urg' ? 'var(--clay)' : x.bucket === 'warn' ? 'var(--amber)' : 'var(--ink)' }}>{x.left} days</b>
                  </div>
                  <Ticks x={x} />
                </>
              )}
            </div>

            {!editingClient ? (
              <>
                {/* Contact — masked, reveal is logged, same as everywhere else */}
                <dl className="kv" style={{ marginBottom: 18 }}>
                  <dt>Email</dt>
                  <dd className="nosel">
                    {shown ? x.e : (
                      <>
                        <span className="masked">{maskEmail(x.e)}</span>
                        <button className="rev" onClick={() => reveal(x.id).then(() => toast('Contact shown — the reveal is logged.'))}>Show</button>
                      </>
                    )}
                  </dd>
                  <dt>Phone</dt>
                  <dd className="nosel">
                    {shown ? <span className="mono">{x.p}</span> : (
                      <>
                        <span className="masked">{maskPhone(x.p)}</span>
                        <button className="rev" onClick={() => reveal(x.id).then(() => toast('Contact shown — the reveal is logged.'))}>Show</button>
                      </>
                    )}
                  </dd>
                  <dt>Clinic</dt><dd>{x.clinic || customer?.clinic || '—'}</dd>
                  <dt>Assigned rep</dt>
                  <dd>{x.rep ? (
                    <button onClick={() => {
                      const r = reps.find(rr => rr.name === x.rep)
                      if (r) openDrawer({ kind: 'r', id: r.id })
                    }}>{x.rep}</button>
                  ) : <span className="never">Unassigned</span>}</dd>
                  <dt>Account status</dt><dd>{accountStatusLabel(x.accountStatus)}</dd>
                  <dt>Country</dt><dd>{flag(x.cc)} {x.c}</dd>
                  <dt>{awaitingReview ? 'Access status' : 'Access granted'}</dt>
                  <dd className={awaitingReview ? undefined : 'mono'}>{awaitingReview ? 'Not granted — pending admin approval' : x.acc ? fmt(x.acc) : '—'}</dd>
                  <dt>Registered</dt><dd className="mono">{customer?.registered_at || '—'}</dd>
                  <dt>Reg. city</dt><dd>{customer?.registration_location?.city || '—'}</dd>
                  <dt>Reg. state</dt><dd>{customer?.registration_location?.state || '—'}</dd>
                  <dt>Reg. country</dt><dd>{customer?.registration_location?.country || '—'}</dd>
                  <dt>Client ID</dt><dd className="mono">#{clientId}</dd>
                </dl>

                <div className="fgrid">
                  <AddressBox title="Billing address" address={customer?.billing} />
                  <AddressBox title="Shipping address" address={customer?.shipping} />
                </div>
                {customerError && (
                  <p style={{ marginTop: 10, fontSize: 12, color: 'var(--muted)' }}>
                    Registration and address details couldn&rsquo;t be loaded right now — {customerError}
                  </p>
                )}
              </>
            ) : clientForm && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div className="fgrid">
                  {[
                    ['First name', 'first_name'], ['Last name', 'last_name'], ['Email', 'email'],
                    ['Phone', 'phone'], ['Clinic', 'clinic'],
                  ].map(([label, field]) => (
                    <label className="field" key={field}>
                      <span>{label}</span>
                      <input value={clientForm[field] || ''} onChange={e => updateFormField(field, e.target.value)} />
                    </label>
                  ))}
                </div>

                {(['billing', 'shipping'] as const).map(type => (
                  <div className="box" key={type}>
                    <div className="box-h">{type} address</div>
                    <div className="fgrid">
                      {[
                        ['First name', 'first_name'], ['Last name', 'last_name'], ['Company', 'company'],
                        ['Address line 1', 'address_1'], ['Address line 2', 'address_2'], ['City', 'city'],
                        ['State / Province', 'state'], ['Postal / ZIP code', 'postcode'], ['Country code', 'country'],
                        ...(type === 'billing' ? [['Billing email', 'email'], ['Billing phone', 'phone']] : []),
                      ].map(([label, field]) => (
                        <label className="field" key={`${type}-${field}`}>
                          <span>{label}</span>
                          <input
                            value={clientForm[type]?.[field] || ''}
                            onChange={e => updateAddressField(type, field, e.target.value)}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                ))}

                {updateCustomerError && (
                  <div style={{ color: 'var(--clay)', fontSize: 12.5 }}>{updateCustomerError}</div>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button className="btn btn-sm" onClick={() => setEditingClient(false)} disabled={savingCustomer}>Cancel</button>
                  <button className="btn btn-sm btn-dark" onClick={handleSaveClient} disabled={savingCustomer}>
                    {savingCustomer ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </div>
            )}

            {clientSaved && (
              <div style={{ marginTop: 14, background: 'var(--jade-bg)', color: 'var(--jade)', borderRadius: 11, padding: '10px 14px', fontSize: 13 }}>
                Client information updated successfully.
              </div>
            )}

            {/* Same actions the drawer/sheet give everywhere else in the app */}
            {!editingClient && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 18, paddingTop: 15, borderTop: '1px solid var(--line-soft)' }}>
                <button
                  className="btn btn-sm btn-dark"
                  disabled={awaitingReview}
                  onClick={async () => {
                    try { await advanceStage(x.id); toast(`${x.n}: ${STAGE[x.stage].act} logged.`) }
                    catch (e: any) { toast(e.message || 'Could not update the stage.') }
                  }}
                >{awaitingReview ? 'Pending approval' : st!.act}</button>
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
                {!awaitingReview && (
                  <button
                    className="btn btn-sm"
                    onClick={async () => { await extend([x.id], 15); toast('Window extended 15 days.') }}
                  >Extend 15 days</button>
                )}
                {canManageAccess && !awaitingReview && (
                  x.accountStatus === 'deactivated' ? (
                    <button
                      className="btn btn-sm"
                      disabled={busy === x.id}
                      onClick={async () => {
                        try { await reactivateAccount(x.id); toast(`${x.n}: account reactivated.`) }
                        catch (e: any) { toast(e.message || 'Could not reactivate the account.') }
                      }}
                    >Reactivate account</button>
                  ) : (
                    <button
                      className="btn btn-sm btn-clay"
                      disabled={busy === x.id}
                      onClick={async () => {
                        if (!confirm(`Deactivate ${x.n}'s account? They will not be able to log in or place orders until reactivated.`)) return
                        try { await deactivateAccount(x.id); toast(`${x.n}: account deactivated.`) }
                        catch (e: any) { toast(e.message || 'Could not deactivate the account.') }
                      }}
                    >Deactivate account</button>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Quick stats ── */}
      {x && (
        <div className="stats" style={{ maxWidth: 620 }}>
          <div className="stat">
            <span className="v mono">{x.orders}</span>
            <span className="l">Total orders</span>
          </div>
          <div className="stat">
            <span className="v mono">{x.last ? fmt(x.last) : '—'}</span>
            <span className="l">Last order</span>
          </div>
          <div className="stat">
            <span className="v mono">{x.last ? `${dayDiff(x.last, today())}d` : '—'}</span>
            <span className="l">Days since last order</span>
          </div>
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <ConsentButtons clientId={clientId} customer={customer} isActive={isActive} country={country} />
      </div>

      {/* ── Order history / notes / place order ── */}
      <div className="bar" style={{ marginTop: 16, borderBottom: 'none', paddingBottom: 0 }}>
        <div className="seg">
          <button className={tab === 'orders' ? 'on' : ''} onClick={() => setTab('orders')}>Order history</button>
          <button className={tab === 'notes' ? 'on' : ''} onClick={() => setTab('notes')}>
            Follow-ups & notes{notes.length > 0 ? ` (${notes.length})` : ''}
          </button>
          {canPlaceOrder && (
            <button className={tab === 'place' ? 'on' : ''} onClick={() => setTab('place')}>Place order</button>
          )}
        </div>
      </div>

      {tab === 'orders' && (
        <div className="panel" style={{ marginTop: 12 }}>
          {isOrdersLoadingFor(clientId) && !isOrdersLoadedFor(clientId) ? (
            <div className="empty">Loading order history…</div>
          ) : ords.length ? ords.map(o => {
            const stat = orderStatus(o.status)
            return (
              <button key={o.id} className="li" onClick={() => openDrawer({ kind: 'o', id: o.id })}>
                <span className="grow">
                  <span className="t">
                    Order {o.number}
                    <span className={`pill ${stat.k}`}>{stat.t}</span>
                  </span>
                  <span className="s">{fmt(o.date)} · {o.itemCount} unit{o.itemCount === 1 ? '' : 's'}{o.placedBy ? ` · placed by ${o.placedBy}` : ''}</span>
                </span>
                <span className="mono" style={{ fontWeight: 600 }}>{money(o.total)}</span>
                <ChevronRight />
              </button>
            )
          }) : (
            <div className="empty">No orders yet.</div>
          )}
        </div>
      )}

      {tab === 'notes' && (
        <div className="panel" style={{ marginTop: 12 }}>
          <div style={{ padding: 15, borderBottom: '1px solid var(--line-soft)' }}>
            <label className="field">
              <span>Log an activity</span>
              <textarea
                placeholder="e.g. Called client — interested in new products. Follow up next Tuesday."
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
              />
            </label>
            {noteError && <div style={{ marginTop: 8, color: 'var(--clay)', fontSize: 12.5 }}>{noteError}</div>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
              <select value={noteType} onChange={e => setNoteType(e.target.value as Note['type'])} style={{ width: 150 }}>
                <option value="note">Note</option>
                <option value="call">Call</option>
                <option value="email">Email</option>
                <option value="followup">Follow-up</option>
              </select>
              <button className="btn btn-sm btn-dark" onClick={handleAddNote} disabled={saving || !noteText.trim()} style={{ marginLeft: 'auto' }}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>

          <div style={{ padding: 15 }}>
            {notesLoading ? (
              <p style={{ fontSize: 13, color: 'var(--muted)' }}>Loading notes…</p>
            ) : notes.length ? (
              <div className="tl" style={{ marginBottom: 0 }}>
                {notes.map(note => {
                  const meta = NOTE_META[note.type] || NOTE_META.note
                  return (
                    <div className="ev" key={note.id}>
                      {note.text} <span className={`pill ${meta.cls}`}>{meta.label}</span>
                      <time>{note.date} · {note.author}</time>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--muted)' }}>No notes yet. Log your first activity above.</p>
            )}
          </div>
        </div>
      )}

      {tab === 'place' && canPlaceOrder && (
        <div className="panel" style={{ marginTop: 12 }}>
          <div className="panel-h"><h3>Place an order</h3></div>
          <div style={{ padding: 15, maxWidth: 420 }}>
            <MultiProductOrderForm products={products || []} fixedClientId={clientId} />
          </div>
        </div>
      )}
    </>
  )
}
