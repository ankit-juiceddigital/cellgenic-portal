// File: src/app/api/orders/route.ts
//
// Server-side proxy for creating WooCommerce orders.
// Keeps WC_CONSUMER_KEY / WC_CONSUMER_SECRET server-only — this is a
// write endpoint, so it's especially important the secret never reaches
// the browser.

import { NextResponse } from 'next/server'

const WC_URL = process.env.NEXT_PUBLIC_WC_URL
const WC_KEY = process.env.WC_CONSUMER_KEY
const WC_SECRET = process.env.WC_CONSUMER_SECRET

export async function POST(request: Request) {
  if (!WC_URL || !WC_KEY || !WC_SECRET) {
    return NextResponse.json(
      { message: 'WooCommerce environment variables are not configured on the server.' },
      { status: 500 }
    )
  }

  const params = await request.json()

  const lineItem: any = {
    product_id: params.productId,
    quantity: params.quantity,
  }
  if (params.variationId) {
    lineItem.variation_id = params.variationId
  }

  const shippingLine = params.shippingMethod === 'overnight'
    ? { method_id: 'flat_rate', method_title: 'Overnight (Dry Ice)', total: '250.00' }
    : { method_id: 'flat_rate', method_title: 'Standard Shipping', total: '60.00' }

  const credentials = Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64')

  const res = await fetch(`${WC_URL}/wp-json/wc/v3/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      customer_id: params.customerId,
      status: 'processing',
      line_items: [lineItem],
      shipping_lines: [shippingLine],
      meta_data: params.repNote
        ? [{ key: '_placed_by_rep', value: params.repNote }]
        : [],
    }),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    return NextResponse.json(
      { message: error.message || `WooCommerce API error: ${res.status}` },
      { status: res.status }
    )
  }

  const order = await res.json()
  return NextResponse.json(order)
}
