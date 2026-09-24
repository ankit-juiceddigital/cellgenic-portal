// File: src/app/api/orders/route.ts
// Server-side route — WC credentials never exposed to the browser.

import { NextResponse } from 'next/server'
import { getWordPressUserDetails } from '@/lib/auth'
import { upsertOrder } from '@/lib/server/orders-store'

const WP_URL = process.env.NEXT_PUBLIC_WP_URL

export async function POST(request: Request) {
  const WC_URL = process.env.NEXT_PUBLIC_WC_URL
  const WC_KEY = process.env.WC_CONSUMER_KEY
  const WC_SECRET = process.env.WC_CONSUMER_SECRET

  if (!WC_URL || !WC_KEY || !WC_SECRET) {
    return NextResponse.json(
      { error: 'WooCommerce credentials not configured.' },
      { status: 500 }
    )
  }

  // SECURITY: this route had NO auth check. Combined with the
  // `Access-Control-Allow-Origin: *` header vercel.json sets on /api/*,
  // any website could POST here and create a real `processing` order for
  // any customer on the store. It now requires the same Bearer token as
  // every other authenticated route, and a sales rep can only order for
  // one of their OWN clients — the same ownership rule /api/orders/all
  // and /api/orders/client/[id] already use.
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }

  let caller: { role: string }
  try {
    caller = await getWordPressUserDetails(token)
  } catch {
    return NextResponse.json({ error: 'Invalid or expired session.' }, { status: 401 })
  }

  const credentials = Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64')

  try {
    const body = await request.json()

    const { customerId, productId, variationId, quantity, shippingMethod, repNote } = body

    if (!customerId || !productId || !quantity) {
      return NextResponse.json(
        { error: 'Missing required fields: customerId, productId, quantity.' },
        { status: 400 }
      )
    }

    if (caller.role === 'sales_rep') {
      const myClientsRes = await fetch(`${WP_URL}/wp-json/cellgenic/v1/my-clients`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      const myClients = myClientsRes.ok ? await myClientsRes.json() : []
      const mine = new Set((myClients || []).map((c: any) => String(c.id)))
      if (!mine.has(String(customerId))) {
        return NextResponse.json(
          { error: 'You can only place orders for your own clients.' },
          { status: 403 }
        )
      }
    }

    const lineItem: any = { product_id: productId, quantity }
    if (variationId) lineItem.variation_id = variationId

    const shippingLine = shippingMethod === 'overnight'
      ? { method_id: 'flat_rate', method_title: 'Overnight (Dry Ice)', total: '250.00' }
      : { method_id: 'flat_rate', method_title: 'Standard Shipping', total: '60.00' }

    const orderPayload: any = {
      customer_id: customerId,
      status: 'processing',
      line_items: [lineItem],
      shipping_lines: [shippingLine],
    }

    if (repNote) {
      orderPayload.meta_data = [{ key: '_placed_by_rep', value: repNote }]
    }

    const res = await fetch(`${WC_URL}/wp-json/wc/v3/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderPayload),
      cache: 'no-store',
    })

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json(
        { error: data.message || `WC error ${res.status}` },
        { status: res.status }
      )
    }

    // Visible in the portal's order lists immediately — no waiting for
    // the next sync.
    upsertOrder(data)

    return NextResponse.json({ success: true, orderId: data.id, orderNumber: data.number })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to place order.' },
      { status: 500 }
    )
  }
}
