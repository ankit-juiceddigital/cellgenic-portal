// File: src/app/api/orders/[id]/route.ts
// Fetches full details of a single WooCommerce order by ID.
// Server-side only — WC credentials never reach the browser.

import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const WC_URL = process.env.NEXT_PUBLIC_WC_URL
  const WC_KEY = process.env.WC_CONSUMER_KEY
  const WC_SECRET = process.env.WC_CONSUMER_SECRET

  if (!WC_URL || !WC_KEY || !WC_SECRET) {
    return NextResponse.json(
      { error: 'WooCommerce credentials not configured.' },
      { status: 500 }
    )
  }

  const orderId = params.id
  if (!orderId || isNaN(Number(orderId))) {
    return NextResponse.json({ error: 'Invalid order ID.' }, { status: 400 })
  }

  const credentials = Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64')

  try {
    const res = await fetch(`${WC_URL}/wp-json/wc/v3/orders/${orderId}`, {
      headers: { Authorization: `Basic ${credentials}` },
      cache: 'no-store',
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return NextResponse.json(
        { error: err.message || `WC error ${res.status}` },
        { status: res.status }
      )
    }

    const order = await res.json()

    // Return a clean, formatted response
    return NextResponse.json({
      id: order.id,
      number: `#CG-${order.number}`,
      status: order.status,
      date: new Date(order.date_created).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true,
      }),
      customer: {
        name: `${order.billing.first_name} ${order.billing.last_name}`.trim(),
        email: order.billing.email,
        phone: order.billing.phone,
        company: order.billing.company,
      },
      shipping_address: [
        order.shipping.address_1,
        order.shipping.address_2,
        order.shipping.city,
        order.shipping.state,
        order.shipping.postcode,
        order.shipping.country,
      ].filter(Boolean).join(', '),
      line_items: order.line_items.map((item: any) => ({
        id: item.id,
        name: item.name,
        sku: item.sku,
        quantity: item.quantity,
        price: `$${parseFloat(item.price).toFixed(2)}`,
        subtotal: `$${parseFloat(item.subtotal).toFixed(2)}`,
      })),
      shipping_lines: order.shipping_lines.map((s: any) => ({
        method: s.method_title,
        total: `$${parseFloat(s.total).toFixed(2)}`,
      })),
      // Calculate subtotal from line items — order.subtotal can be empty/null from WC
      subtotal: `$${order.line_items.reduce((sum: number, item: any) => sum + parseFloat(item.subtotal || '0'), 0).toFixed(2)}`,
      shipping_total: `$${parseFloat(order.shipping_total).toFixed(2)}`,
      total: `$${parseFloat(order.total).toFixed(2)}`,
      payment_method: order.payment_method_title || order.payment_method,
      customer_note: order.customer_note || '',
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch order.' },
      { status: 500 }
    )
  }
}
