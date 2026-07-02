// File: src/app/api/orders/route.ts
// Server-side route — WC credentials never exposed to the browser.

import { NextResponse } from 'next/server'

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

    return NextResponse.json({ success: true, orderId: data.id, orderNumber: data.number })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to place order.' },
      { status: 500 }
    )
  }
}
