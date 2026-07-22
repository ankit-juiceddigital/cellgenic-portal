'use client'

// File: src/app/clients/[id]/page.tsx

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useClientOrders, useNotes, usePlaceOrder, useCustomer, useConsentStatus, useClients } from '@/hooks/useData'
import { useProducts } from '@/hooks/useData'
import { Topbar } from '@/components/layout/Topbar'
import { Card, MetricCard } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Tabs } from '@/components/ui/Tabs'
import { TableSkeleton, ErrorState } from '@/components/ui/Skeleton'
import { noteIconClass, noteTagClass, noteTagLabel } from '@/lib/utils'
import { ArrowLeft, Phone, Mail, FileText, Clock, AlertTriangle, Plus, CheckCircle } from 'lucide-react'
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

export default function ClientDetailPage({ params }: { params: { id: string } | Promise<{ id: string }> }) {
  const { isRep } = useAuth()
  // `params` is a plain object on Next 14 but a Promise on Next 15+ ("async
  // dynamic APIs"). Handle both so this doesn't silently resolve to
  // `undefined` -> NaN client IDs -> failed customer/notes requests.
  const resolvedParams = typeof (params as any)?.then === 'function'
    ? use(params as Promise<{ id: string }>)
    : (params as { id: string })
  const clientId = parseInt(resolvedParams.id)

  const { data: clientOrders, loading: ordersLoading } = useClientOrders(clientId)
  const { data: customer } = useCustomer(clientId)
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
  const { placeOrder, loading: orderLoading, success: orderSuccess, error: orderError } = usePlaceOrder()

  const [noteText, setNoteText] = useState('')
  const [noteType, setNoteType] = useState<Note['type']>('note')
  const [saving, setSaving] = useState(false)

  // Order form state
  const [selectedProduct, setSelectedProduct] = useState<number>(0)
  const [quantity, setQuantity] = useState(5)
  const [shipping, setShipping] = useState<'standard' | 'overnight'>('standard')

  const handleAddNote = async () => {
    if (!noteText.trim()) return
    setSaving(true)
    await addNote(noteText.trim(), noteType)
    setNoteText('')
    setSaving(false)
  }

  const handlePlaceOrder = async () => {
    if (!selectedProduct) return
    await placeOrder({
      customerId: clientId,
      productId: selectedProduct,
      quantity,
      shippingMethod: shipping,
    })
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
    ...(isRep ? [{ id: 'place', label: 'Place order' }] : []),
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

        {customer && (
          <div className="flex items-center gap-4">
            <div>
              <p className="text-lg font-semibold text-gray-900">{customer.name}</p>
              <p className="text-sm text-gray-400">{customer.email}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 max-w-lg">
          <MetricCard label="Total orders" value={String(clientOrders?.length || 0)} />
          <MetricCard label="Last order" value={clientOrders?.[0]?.date || 'Never'} />
          <MetricCard label="Client ID" value={`#${clientId}`} />
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
                        {clientOrders.map((order: any, i: number) => (
                          <div key={i} className="flex gap-4 py-4 border-b border-gray-50 last:border-0">
                            <div className="w-2 h-2 rounded-full bg-brand mt-1.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-xs text-gray-400 font-mono mb-0.5">{order.number} · {order.date}</p>
                              <p className="text-sm font-medium text-gray-900">{order.products}</p>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-xs text-gray-500">{order.total}</span>
                                <Badge variant="teal">{order.status}</Badge>
                              </div>
                            </div>
                          </div>
                        ))}
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

                {/* Place order */}
                {active === 'place' && isRep && (
                  <div className="p-4 max-w-md space-y-4">
                    {orderSuccess ? (
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                        <CheckCircle size={18} className="text-green-600 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-green-700">Order placed successfully</p>
                          <p className="text-xs text-green-600 mt-0.5">The client will receive a confirmation email.</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {orderError && (
                          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600">
                            {orderError}
                          </div>
                        )}
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">Product</label>
                          <select
                            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-brand"
                            value={selectedProduct}
                            onChange={e => setSelectedProduct(Number(e.target.value))}
                          >
                            <option value={0}>Select a product...</option>
                            {(products || []).map((p: any) => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">Quantity</label>
                          <input
                            type="number"
                            min={1}
                            value={quantity}
                            onChange={e => setQuantity(Number(e.target.value))}
                            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-brand"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">Shipping</label>
                          <select
                            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-brand"
                            value={shipping}
                            onChange={e => setShipping(e.target.value as 'standard' | 'overnight')}
                          >
                            <option value="standard">Standard — $60</option>
                            <option value="overnight">Overnight (dry ice) — $250</option>
                          </select>
                        </div>
                        <Button
                          variant="primary"
                          className="w-full justify-center"
                          onClick={handlePlaceOrder}
                          disabled={orderLoading || !selectedProduct}
                        >
                          {orderLoading ? 'Placing order...' : 'Submit order'}
                        </Button>
                      </>
                    )}
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
