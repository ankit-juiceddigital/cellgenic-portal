// File: src/app/api/orders/client/[customerId]/route.ts
//
// Server-side proxy for fetching a customer's WooCommerce orders.

import { NextResponse } from 'next/server'

const WC_URL = process.env.NEXT_PUBLIC_WC_URL
const WC_KEY = process.env.WC_CONSUMER_KEY
const WC_SECRET = process.env.WC_CONSUMER_SECRET

export async function GET(
  request: Request,
  { params }: { params: { customerId: string } | Promise<{ customerId: string }> }
) {
  if (!WC_URL || !WC_KEY || !WC_SECRET) {
    return NextResponse.json(
      { message: 'WooCommerce environment variables are not configured on the server.' },
      { status: 500 }
    )
  }

  const { customerId } = await params
  const credentials = Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64')

  const res = await fetch(
    `${WC_URL}/wp-json/wc/v3/orders?customer=${customerId}&per_page=50&orderby=date&order=desc`,
    {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    }
  )

  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    return NextResponse.json(
      { message: error.message || `WooCommerce API error: ${res.status}` },
      { status: res.status }
    )
  }

  const orders = await res.json()

  const mapped = orders.map((o: any) => ({
    id: o.id,
    number: `#CG-${o.number}`,
    date: new Date(o.date_created).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    status: o.status,
    total: `$${parseFloat(o.total).toLocaleString()}`,
    products: o.line_items.map((item: any) => `${item.name} × ${item.quantity}`).join(', '),
  }))

  return NextResponse.json(mapped)
}
