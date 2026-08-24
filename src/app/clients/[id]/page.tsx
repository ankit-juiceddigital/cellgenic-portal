'use client'

// File: src/app/clients/[id]/page.tsx

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useClientOrders, useNotes, useCustomer, useUpdateCustomer, useConsentStatus, useClients } from '@/hooks/useData'
import { useProducts } from '@/hooks/useData'
import { MultiProductOrderForm } from '@/components/MultiProductOrder'
import { Topbar } from '@/components/layout/Topbar'
import { Card, MetricCard } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Tabs } from '@/components/ui/Tabs'
import { TableSkeleton, ErrorState } from '@/components/ui/Skeleton'
import { noteIconClass, noteTagClass, noteTagLabel } from '@/lib/utils'
import { ArrowLeft, Phone, Mail, FileText, Clock, AlertTriangle, Plus, CheckCircle, ChevronDown, ChevronUp, MapPin, Pencil, X } from 'lucide-react'
import Link from 'next/link'
import { use } from 'react'
import type { Note } from '@/types'

// ─────────────────────────────────────────────
// DocuSign consent buttons (Part E of the build guide)
// Shown for any ACTIVE client (independent of order history - a client
// can be active with zero orders so far), restricted to US / Mexico.
// Sends the appropriate consent template and reflects persisted
// sent/signed status from WordPress.
// ─────────────────────────────────────────────
const ELIGIBLE_COUNTRIES = ['US', 'MX', 'United States', 'Mexico']

function ConsentButtons({
  clientId,
  customer,
  isActive,
  country,
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

  // Admin-only — sales reps and managers should not see or trigger these.
  if (!isAdmin) return null

  // Gate on the client's active status, NOT on whether the WooCommerce
  // customer/order record has loaded - a client with no orders yet can
  // still be active and should still be able to send consent forms.
  if (!isActive) return null

  // Country eligibility uses the client's registered country (from the
  // clients list), not the WooCommerce billing/shipping address. A client
  // with no orders yet often has no WC billing address, so that value
  // resolves to '' once the customer fetch completes - which previously
  // caused the section to flash and then hide itself a moment later.
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
          clientId,
          clientName: customer.name,
          clientEmail: customer.email,
          formType,
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

  const renderButton = (formType: 'research' | 'cosmetic', label: string) => {
    const status = statusFor(formType)
    const isSigned = status === 'signed'
    const isSent = status === 'sent'
    const isSending = sending === formType

    return (
      <div className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg border text-sm">
        <span className="text-gray-700">
          {isSigned
            ? `✅ ${label} Signed`
            : isSent
            ? `✉️ ${label} — awaiting signature`
            : label}
        </span>

        {isSigned ? (
          <span className="text-xs font-medium text-green-600 px-3 py-1.5">Signed</span>
        ) : (
          <button
            onClick={() => sendConsent(formType)}
            disabled={isSending}
            className="px-4 py-1.5 rounded-lg bg-black text-white text-sm font-medium hover:bg-gray-700 active:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSending ? 'Sending...' : isSent ? 'Resend' : 'Send'}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="border border-gray-100 rounded-xl p-4 space-y-2 w-full md:w-1/2">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Consent Forms</p>
      {error && <p className="text-xs text-red-500">{error}</p>}
      {renderButton('research', 'Research Use Only Consent')}
      {renderButton('cosmetic', 'Cosmetic Use Consent')}
    </div>
  )
}

const noteIcon = (type: string) => {
  if (type === 'call') return <Phone size={14} />
  if (type === 'email') return <Mail size={14} />
  if (type === 'followup') return <Clock size={14} />
  return <FileText size={14} />
}

function DetailField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm text-gray-700 break-words">{value || '—'}</p>
    </div>
  )
}

function AddressBlock({ title, address }: { title: string; address?: any }) {
  const lines = [
    [address?.first_name, address?.last_name].filter(Boolean).join(' '),
    address?.company,
    address?.address_1,
    address?.address_2,
    [address?.city, address?.state, address?.postcode].filter(Boolean).join(', '),
    address?.country,
  ].filter(Boolean)

  return (
    <div className="border border-gray-100 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <MapPin size={14} className="text-gray-400" />
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{title}</p>
      </div>
      {lines.length > 0 ? (
        <div className="space-y-1">
          {lines.map((line, i) => <p key={i} className="text-sm text-gray-700">{line}</p>)}
          {address?.phone && <p className="text-sm text-gray-500 mt-2">Phone: {address.phone}</p>}
          {address?.email && <p className="text-sm text-gray-500">Email: {address.email}</p>}
        </div>
      ) : (
        <p className="text-sm text-gray-400">No address added yet.</p>
      )}
    </div>
  )
}

const emptyAddress = {
  first_name: '', last_name: '', company: '', address_1: '', address_2: '',
  city: '', state: '', postcode: '', country: '', email: '', phone: '',
}

export default function ClientDetailPage({ params }: { params: { id: string } | Promise<{ id: string }> }) {
  const { isRep, isManager, isAdmin } = useAuth()
  // `params` is a plain object on Next 14 but a Promise on Next 15+ ("async
  // dynamic APIs"). Handle both so this doesn't silently resolve to
  // `undefined` -> NaN client IDs -> failed customer/notes requests.
  const resolvedParams = typeof (params as any)?.then === 'function'
    ? use(params as Promise<{ id: string }>)
    : (params as { id: string })
  const clientId = parseInt(resolvedParams.id)

  const { data: clientOrders, loading: ordersLoading } = useClientOrders(clientId)
  const { data: customer, loading: customerLoading, error: customerError, refetch: refetchCustomer } = useCustomer(clientId)
  const { save: saveCustomer, saving: savingCustomer, error: updateCustomerError } = useUpdateCustomer()
  const { data: clients } = useClients()
  const { notes, loading: notesLoading, addNote } = useNotes(clientId)

  // Active/at-risk status comes from the clients list, independent of
  // order history, so consent forms stay available for active clients
  // even before they have placed any orders. Default to true while the
  // clients list is still loading so the section is not hidden by default.
  const clientRecord = clients?.find((c: any) => c.id === clientId)
  const isActive = clientRecord ? !clientRecord.at_risk : true
  const country = clientRecord?.country || customer?.country || null
  const { data: products } = useProducts()

  const [noteText, setNoteText] = useState('')
  const [expandedOrders, setExpandedOrders] = useState<Record<number, boolean>>({})
  const [noteType, setNoteType] = useState<Note['type']>('note')
  const [saving, setSaving] = useState(false)
  const [noteError, setNoteError] = useState<string | null>(null)
  const [editingClient, setEditingClient] = useState(false)
  const [clientForm, setClientForm] = useState<any>(null)
  const [clientSaved, setClientSaved] = useState(false)

  // Anyone who can place orders elsewhere (rep, manager, admin) can also
  // place one right here on the client's own page.
  const canPlaceOrder = isRep || isManager || isAdmin

  const handleAddNote = async () => {
    if (!noteText.trim()) return
    setSaving(true)
    setNoteError(null)
    try {
      await addNote(noteText.trim(), noteType)
      setNoteText('')
    } catch (err: any) {
      // BUG FIX: previously there was no catch here at all — if the save
      // failed (which it always did, since the backend endpoint didn't
      // exist), the thrown error skipped straight past `setSaving(false)`
      // and the button was stuck on "Saving..." forever with no feedback.
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

  const updateFormField = (field: string, value: string) => {
    setClientForm((prev: any) => ({ ...prev, [field]: value }))
  }

  const updateAddressField = (type: 'billing' | 'shipping', field: string, value: string) => {
    setClientForm((prev: any) => ({
      ...prev,
      [type]: { ...prev[type], [field]: value },
    }))
  }

  const handleSaveClient = async () => {
    if (!clientForm) return
    setClientSaved(false)
    try {
      await saveCustomer(clientId, clientForm)
      await refetchCustomer()
      setEditingClient(false)
      setClientSaved(true)
    } catch {
      // Error is exposed by useUpdateCustomer below the form.
    }
  }

  const tabs = [
    { id: 'orders', label: 'Order history' },
    {
      id: 'followup',
      label: (
        <span className="flex items-center gap-1.5">
          Follow-ups & notes
          {notes.length > 0 && (
            <span className="bg-gray-100 text-gray-500 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
              {notes.length}
            </span>
          )}
        </span>
      ),
    },
    ...(canPlaceOrder ? [{ id: 'place', label: 'Place order' }] : []),
  ]

  return (
    <>
      <Topbar title="Client Details" subtitle="Order history and follow-up log" />
      <div className="p-4 md:p-7 space-y-5">
        <Link href="/clients">
          <button className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors">
            <ArrowLeft size={14} /> Back to clients
          </button>
        </Link>

        {customerLoading && <TableSkeleton rows={2} />}
        {customerError && <ErrorState message={customerError} onRetry={refetchCustomer} />}

        {customer && (
          <Card>
            <div className="p-5 space-y-5">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-gray-900">{customer.name}</p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
                    <span className="inline-flex items-center gap-1.5"><Mail size={13} /> {customer.email || 'No email'}</span>
                    <span className="inline-flex items-center gap-1.5"><Phone size={13} /> {customer.phone || 'No phone'}</span>
                  </div>
                </div>
                {!editingClient && (
                  <Button size="sm" onClick={startEditingClient}>
                    <Pencil size={13} /> Edit client information
                  </Button>
                )}
              </div>

              {clientSaved && (
                <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700">
                  Client information updated successfully.
                </div>
              )}

              {!editingClient ? (
                <>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
                    <DetailField label="Clinic" value={customer.clinic} />
                    <DetailField label="Assigned rep" value={customer.assigned_rep} />
                    <DetailField label="Account status" value={customer.account_status} />
                    <DetailField label="Registered" value={customer.registered_at} />
                    <DetailField label="Registration city" value={customer.registration_location?.city} />
                    <DetailField label="Registration state" value={customer.registration_location?.state} />
                    <DetailField label="Registration country" value={customer.registration_location?.country} />
                    <DetailField label="Client ID" value={`#${clientId}`} />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <AddressBlock title="Billing address" address={customer.billing} />
                    <AddressBlock title="Shipping address" address={customer.shipping} />
                  </div>
                </>
              ) : clientForm && (
                <div className="space-y-5 border-t border-gray-100 pt-5">
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[
                      ['First name', 'first_name'], ['Last name', 'last_name'], ['Email', 'email'],
                      ['Phone', 'phone'], ['Clinic', 'clinic'],
                    ].map(([label, field]) => (
                      <label key={field} className="block">
                        <span className="text-xs text-gray-500">{label}</span>
                        <input
                          value={clientForm[field] || ''}
                          onChange={e => updateFormField(field, e.target.value)}
                          className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand"
                        />
                      </label>
                    ))}
                  </div>

                  {(['billing', 'shipping'] as const).map(type => (
                    <div key={type} className="border border-gray-100 rounded-xl p-4">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">{type} address</p>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {[
                          ['First name', 'first_name'], ['Last name', 'last_name'], ['Company', 'company'],
                          ['Address line 1', 'address_1'], ['Address line 2', 'address_2'], ['City', 'city'],
                          ['State / Province', 'state'], ['Postal / ZIP code', 'postcode'], ['Country code', 'country'],
                          ...(type === 'billing' ? [['Billing email', 'email'], ['Billing phone', 'phone']] : []),
                        ].map(([label, field]) => (
                          <label key={`${type}-${field}`} className="block">
                            <span className="text-xs text-gray-500">{label}</span>
                            <input
                              value={clientForm[type]?.[field] || ''}
                              onChange={e => updateAddressField(type, field, e.target.value)}
                              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand"
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}

                  {updateCustomerError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600">
                      {updateCustomerError}
                    </div>
                  )}
                  <div className="flex items-center justify-end gap-2">
                    <Button size="sm" onClick={() => setEditingClient(false)} disabled={savingCustomer}>
                      <X size={13} /> Cancel
                    </Button>
                    <Button variant="primary" size="sm" onClick={handleSaveClient} disabled={savingCustomer}>
                      <CheckCircle size={13} /> {savingCustomer ? 'Saving...' : 'Save changes'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl">
          <MetricCard label="Total orders" value={String(clientOrders?.length || 0)} />
          <MetricCard label="Last order" value={clientOrders?.[0]?.date || clientRecord?.last_order || 'Never'} />
          <MetricCard label="Days since last order" value={clientRecord?.days_since != null ? `${clientRecord.days_since} days` : '—'} />
        </div>

        <ConsentButtons clientId={clientId} customer={customer} isActive={isActive} country={country} />

        <Card>
          <Tabs tabs={tabs}>
            {(active) => (
              <>
                {/* Orders */}
                {active === 'orders' && (
                  <div className="p-4">
                    {ordersLoading ? (
                      <TableSkeleton rows={3} />
                    ) : clientOrders && clientOrders.length > 0 ? (
                      <div className="space-y-0">
                        {clientOrders.map((order: any, i: number) => {
                          const isOpen = !!expandedOrders[order.id]
                          return (
                            <div key={order.id ?? i} className="border-b border-gray-50 last:border-0">
                              <button
                                type="button"
                                onClick={() => setExpandedOrders(prev => ({ ...prev, [order.id]: !prev[order.id] }))}
                                className="w-full flex gap-4 py-4 text-left hover:bg-gray-50/50 transition-colors -mx-4 px-4"
                              >
                                <div className="w-2 h-2 rounded-full bg-brand mt-1.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <p className="text-xs text-gray-400 font-mono mb-0.5">{order.number} · {order.date}</p>
                                  <p className="text-sm font-medium text-gray-900">{order.products}</p>
                                  <div className="flex items-center gap-3 mt-1">
                                    <span className="text-xs text-gray-500">{order.total}</span>
                                    <Badge variant="teal">{order.status}</Badge>
                                    {order.placedBy && (
                                      <span className="text-xs text-gray-400">Placed by: {order.placedBy}</span>
                                    )}
                                  </div>
                                </div>
                                {isOpen ? <ChevronUp size={16} className="text-gray-400 flex-shrink-0 mt-1" /> : <ChevronDown size={16} className="text-gray-400 flex-shrink-0 mt-1" />}
                              </button>

                              {/* Full order details — products with unit price, shipping, payment method */}
                              {isOpen && (
                                <div className="pb-4 pl-6 space-y-3">
                                  <div className="bg-gray-50 rounded-lg overflow-hidden">
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="border-b border-gray-100">
                                          <th className="text-left px-3 py-2 font-medium text-gray-400 uppercase tracking-wide">Product</th>
                                          <th className="text-left px-3 py-2 font-medium text-gray-400 uppercase tracking-wide">SKU</th>
                                          <th className="text-right px-3 py-2 font-medium text-gray-400 uppercase tracking-wide">Qty</th>
                                          <th className="text-right px-3 py-2 font-medium text-gray-400 uppercase tracking-wide">Unit price</th>
                                          <th className="text-right px-3 py-2 font-medium text-gray-400 uppercase tracking-wide">Line total</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {(order.lineItems || []).map((item: any, li: number) => (
                                          <tr key={li} className="border-b border-gray-100 last:border-0">
                                            <td className="px-3 py-2 text-gray-800">{item.name}</td>
                                            <td className="px-3 py-2 font-mono text-gray-400">{item.sku || '—'}</td>
                                            <td className="px-3 py-2 text-right text-gray-600">{item.quantity}</td>
                                            <td className="px-3 py-2 text-right text-gray-600">${item.unitPrice.toFixed(2)}</td>
                                            <td className="px-3 py-2 text-right font-medium text-gray-900">${item.lineTotal.toFixed(2)}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                                    <div>
                                      <span className="text-gray-400">Shipping method: </span>
                                      <span className="text-gray-700">{order.shippingMethod || '—'}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-400">Shipping cost: </span>
                                      <span className="text-gray-700">${(order.shippingCost || 0).toFixed(2)}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-400">Payment method: </span>
                                      <span className="text-gray-700">{order.paymentMethod || '—'}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-400">Order total: </span>
                                      <span className="text-gray-900 font-medium">{order.total}</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="py-6 text-sm text-gray-400 text-center">No orders yet.</p>
                    )}
                  </div>
                )}

                {/* Notes */}
                {active === 'followup' && (
                  <div className="p-4 space-y-4">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs font-medium text-gray-400 mb-2">Log an activity</p>
                      <textarea
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 resize-none min-h-[72px] focus:outline-none focus:border-brand bg-white placeholder:text-gray-300"
                        placeholder="e.g. Called client — interested in new products. Follow up next Tuesday."
                        value={noteText}
                        onChange={e => setNoteText(e.target.value)}
                      />
                      {noteError && (
                        <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600">
                          {noteError}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <select
                          value={noteType}
                          onChange={e => setNoteType(e.target.value as Note['type'])}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-brand"
                        >
                          <option value="note">📝 Note</option>
                          <option value="call">📞 Call</option>
                          <option value="email">✉️ Email</option>
                          <option value="followup">⏰ Follow-up</option>
                        </select>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={handleAddNote}
                          disabled={saving || !noteText.trim()}
                          className="ml-auto"
                        >
                          <Plus size={13} /> {saving ? 'Saving...' : 'Save'}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {notesLoading ? (
                        <p className="text-sm text-gray-400">Loading notes...</p>
                      ) : notes.length > 0 ? notes.map(note => (
                        <div key={note.id} className="flex gap-3">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${noteIconClass(note.type)}`}>
                            {noteIcon(note.type)}
                          </div>
                          <div className="flex-1 bg-white border border-gray-100 rounded-xl px-4 py-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-gray-800">{note.author}</span>
                              <span className="text-xs text-gray-400">{note.date}</span>
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed">{note.text}</p>
                            <span className={`inline-block mt-2 text-[10px] font-medium px-2 py-0.5 rounded-full ${noteTagClass(note.type)}`}>
                              {noteTagLabel(note.type)}
                            </span>
                          </div>
                        </div>
                      )) : (
                        <p className="text-sm text-gray-400">No notes yet. Log your first activity above.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Place order — same multi-product form as the standalone Place Order page */}
                {active === 'place' && canPlaceOrder && (
                  <div className="p-4 max-w-md">
                    <MultiProductOrderForm
                      products={products || []}
                      fixedClientId={clientId}
                    />
                  </div>
                )}
              </>
            )}
          </Tabs>
        </Card>
      </div>
    </>
  )
}
