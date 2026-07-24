'use client'
// File: src/components/MultiProductOrder.tsx
//
// Shared "place an order" experience — product search, multiple product
// lines, shipping, and submission. Used by both:
//   - /order (the standalone Place Order page, with a client picker)
//   - the client detail page's "Place order" tab (client is fixed, no
//     picker — this is what was missing there; it previously had a
//     bare single-product form with no way to add more products)

import { useState, useMemo, useRef, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { usePlaceOrder } from '@/hooks/useData'
import { Button } from '@/components/ui/Button'
import { CheckCircle, Search, X, ChevronDown } from 'lucide-react'

// ─────────────────────────────────────────────
// Searchable product dropdown
// ─────────────────────────────────────────────
export function ProductSearch({
  products,
  value,
  onChange,
}: {
  products: any[]
  value: number
  onChange: (id: number, name: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedName, setSelectedName] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const filtered = useMemo(() => {
    if (!query.trim()) return products
    const q = query.toLowerCase()
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.categories && p.categories.some((c: string) => c.toLowerCase().includes(q)))
    )
  }, [products, query])

  const grouped = useMemo(() => {
    const groups: Record<string, any[]> = {}
    filtered.forEach(p => {
      const cat = (p.categories && p.categories[0]) || 'Other'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(p)
    })
    return groups
  }, [filtered])

  const handleSelect = (p: any) => {
    onChange(p.id, p.name)
    setSelectedName(p.name)
    setOpen(false)
    setQuery('')
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(0, '')
    setSelectedName('')
    setQuery('')
  }

  return (
    <div ref={wrapRef} className="relative">
      <div
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between text-sm border rounded-lg px-3 py-2 bg-white cursor-pointer transition-colors ${
          open ? 'border-brand ring-1 ring-brand/20' : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <span className={selectedName ? 'text-gray-900' : 'text-gray-400'}>
          {selectedName || 'Search products…'}
        </span>
        <div className="flex items-center gap-1">
          {selectedName && (
            <button onClick={handleClear} className="text-gray-300 hover:text-gray-500 p-0.5">
              <X size={13} />
            </button>
          )}
          <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
            <Search size={13} className="text-gray-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name, SKU or category…"
              className="flex-1 text-sm outline-none text-gray-900 placeholder-gray-400 bg-transparent"
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-gray-300 hover:text-gray-500">
                <X size={12} />
              </button>
            )}
          </div>

          <div className="px-3 py-1.5 border-b border-gray-50">
            <span className="text-xs text-gray-400">
              {filtered.length} of {products.length} products
            </span>
          </div>

          <div className="overflow-y-auto max-h-64">
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-400">
                No products match &quot;{query}&quot;
              </div>
            ) : (
              Object.entries(grouped).map(([category, items]) => (
                <div key={category}>
                  <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50 sticky top-0">
                    {category}
                  </div>
                  {items.map(p => (
                    <div
                      key={p.id}
                      onClick={() => handleSelect(p)}
                      className={`flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors ${
                        value === p.id ? 'bg-green-50' : ''
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate ${value === p.id ? 'font-semibold text-brand' : 'text-gray-800'}`}>
                          {p.name}
                        </p>
                        {p.sku && (
                          <p className="text-xs text-gray-400 font-mono">{p.sku}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                        {p.price && p.price !== '0' && (
                          <span className="text-xs text-gray-500">${p.price}</span>
                        )}
                        {value === p.id && (
                          <CheckCircle size={14} className="text-brand" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}


// ─────────────────────────────────────────────
// One product line
// ─────────────────────────────────────────────
export interface OrderItem {
  id: string
  productId: number
  productName: string
  quantity: number
}

export function OrderItemRow({
  item,
  products,
  onChange,
  onRemove,
  showRemove,
}: {
  item: OrderItem
  products: any[]
  onChange: (id: string, field: 'productId' | 'quantity' | 'productName', value: any) => void
  onRemove: (id: string) => void
  showRemove: boolean
}) {
  return (
    <div className="flex gap-2 items-start">
      <div className="flex-1">
        <ProductSearch
          products={products}
          value={item.productId}
          onChange={(productId, productName) => {
            onChange(item.id, 'productId', productId)
            onChange(item.id, 'productName', productName)
          }}
        />
      </div>
      <div className="w-20 flex-shrink-0">
        <input
          type="number"
          min={1}
          value={item.quantity}
          onChange={e => onChange(item.id, 'quantity', Number(e.target.value))}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-brand text-center"
          placeholder="Qty"
        />
      </div>
      {showRemove && (
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="w-9 h-9 flex items-center justify-center border border-gray-200 rounded-lg text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors flex-shrink-0"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}


// ─────────────────────────────────────────────
// Full form — client picker (optional), multi-product lines, shipping,
// submit. This is "the same model" both /order and the client detail
// page's Place Order tab now share.
// ─────────────────────────────────────────────
export function MultiProductOrderForm({
  clients,
  products,
  productsLoading,
  fixedClientId,
  onSuccess,
}: {
  clients?: any[]
  products: any[]
  productsLoading?: boolean
  fixedClientId?: number
  onSuccess?: () => void
}) {
  const { user, isAdmin, isManager } = useAuth()
  const { placeOrder, loading, success, error } = usePlaceOrder()

  const [clientId, setClientId] = useState<number>(fixedClientId || 0)
  const [shipping, setShipping] = useState<'standard' | 'overnight'>('standard')
  const [items, setItems] = useState<OrderItem[]>([
    { id: '1', productId: 0, productName: '', quantity: 5 }
  ])
  // Synchronous guard against double-submission — see /order's original
  // comment: relying on the `loading` state alone leaves a render-timing
  // gap that a fast double-click can slip through.
  const isSubmittingRef = useRef(false)

  const repAttribution = isAdmin
    ? 'Administrator'
    : isManager
    ? 'Sales Manager'
    : (user?.name || 'Sales Rep')

  const addItem = () => {
    setItems(prev => [...prev, { id: Date.now().toString(), productId: 0, productName: '', quantity: 5 }])
  }
  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
  }
  const updateItem = (id: string, field: 'productId' | 'quantity' | 'productName', value: any) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmittingRef.current) return
    if (!clientId) return
    const validItems = items.filter(i => i.productId > 0 && i.quantity > 0)
    if (validItems.length === 0) return

    isSubmittingRef.current = true
    try {
      for (const item of validItems) {
        await placeOrder({
          customerId: clientId,
          productId: item.productId,
          quantity: item.quantity,
          shippingMethod: shipping,
          repNote: repAttribution,
        })
      }
      onSuccess?.()
    } finally {
      isSubmittingRef.current = false
    }
  }

  const validItemCount = items.filter(i => i.productId > 0).length

  if (success) {
    return (
      <div className="text-center py-8">
        <CheckCircle size={40} className="text-brand mx-auto mb-4" />
        <p className="text-sm font-semibold text-gray-900 mb-2">Order placed successfully</p>
        <p className="text-xs text-gray-400 mb-6">
          {validItemCount} product{validItemCount > 1 ? 's' : ''} ordered. The client will receive a confirmation email.
        </p>
        <Button onClick={() => window.location.reload()}>Place another order</Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">New order</h2>
        {productsLoading && <span className="text-xs text-gray-400">Loading products…</span>}
        {!productsLoading && products && (
          <span className="text-xs text-brand font-medium">{products.length} products available</span>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600">{error}</div>
      )}

      {/* Client picker — only shown when not already fixed to a specific client */}
      {!fixedClientId && (
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Client</label>
          <select
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-brand"
            value={clientId}
            onChange={e => setClientId(Number(e.target.value))}
            required
          >
            <option value={0}>Select a client…</option>
            {(clients || []).map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}{c.clinic ? ` — ${c.clinic}` : ''}</option>
            ))}
          </select>
        </div>
      )}

      {/* Product lines */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-gray-400">Products</label>
          <span className="text-xs text-gray-400">Qty</span>
        </div>
        <div className="space-y-2">
          {items.map(item => (
            <OrderItemRow
              key={item.id}
              item={item}
              products={products || []}
              onChange={updateItem}
              onRemove={removeItem}
              showRemove={items.length > 1}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={addItem}
          className="mt-2 w-full py-2 text-xs font-medium text-gray-400 border border-dashed border-gray-200 rounded-lg hover:border-brand hover:text-brand transition-colors"
        >
          + Add another product
        </button>
      </div>

      {/* Shipping */}
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

      {/* Summary */}
      {validItemCount > 0 && (
        <div className="bg-gray-50 rounded-lg px-4 py-3 text-xs text-gray-600 space-y-1">
          <p className="font-semibold text-gray-700 mb-1.5">Order summary</p>
          {items.filter(i => i.productId > 0).map(i => (
            <div key={i.id} className="flex justify-between">
              <span className="truncate mr-4">{i.productName}</span>
              <span className="text-gray-400 flex-shrink-0">× {i.quantity}</span>
            </div>
          ))}
        </div>
      )}

      <Button
        variant="primary"
        type="submit"
        disabled={loading || !clientId || validItemCount === 0}
        className="w-full justify-center mt-1"
      >
        {loading ? 'Placing order…' : `Place order${validItemCount > 1 ? ` (${validItemCount} products)` : ''}`}
      </Button>
    </form>
  )
}
