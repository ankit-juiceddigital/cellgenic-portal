'use client'
// File: src/app/order/page.tsx

import { useState } from 'react'
import { useClients, useProducts, usePlaceOrder } from '@/hooks/useData'
import { Topbar } from '@/components/layout/Topbar'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { CheckCircle } from 'lucide-react'

export default function OrderPage() {
  const { data: clients } = useClients()
  const { data: products } = useProducts()
  const { placeOrder, loading, success, error } = usePlaceOrder()

  const [clientId, setClientId] = useState<number>(0)
  const [productId, setProductId] = useState<number>(0)
  const [quantity, setQuantity] = useState(5)
  const [shipping, setShipping] = useState<'standard' | 'overnight'>('standard')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientId || !productId) return
    await placeOrder({ customerId: clientId, productId, quantity, shippingMethod: shipping })
  }

  return (
    <>
      <Topbar title="Place an Order" subtitle="Submit an order on behalf of one of your clients" />
      <div className="p-7">
        <Card padding className="max-w-md">
          {success ? (
            <div className="text-center py-4">
              <CheckCircle size={32} className="text-brand mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-900 mb-1">Order placed successfully</p>
              <p className="text-xs text-gray-400 mb-4">The client will receive a confirmation email.</p>
              <Button onClick={() => window.location.reload()}>Place another order</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h2 className="text-sm font-semibold text-gray-900 mb-2">New order</h2>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600">{error}</div>
              )}

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Client</label>
                <select
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-brand"
                  value={clientId}
                  onChange={e => setClientId(Number(e.target.value))}
                  required
                >
                  <option value={0}>Select a client...</option>
                  {(clients || []).map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name} — {c.clinic}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">
                  Product <span className="text-brand">({(products || []).length} available)</span>
                </label>
                <select
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-brand"
                  value={productId}
                  onChange={e => setProductId(Number(e.target.value))}
                  required
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
                  type="number" min={1} value={quantity}
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

              <Button variant="primary" type="submit" disabled={loading || !clientId || !productId} className="w-full justify-center mt-2">
                {loading ? 'Placing order...' : 'Place order'}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </>
  )
}
