// File: src/app/api/orders/client/[customerId]/route.ts
//
// Server-side proxy for fetching a single customer's WooCommerce orders
// — powers the "Order History" tab on the client detail page.
//
// SECURITY: this used to be dead code (the frontend called WooCommerce
// directly from the browser instead, via woocommerce.ts's wcFetch —
// meaning that code path ran client-side with no auth or ownership
// check at all). This route is now the actual, protected path: it
// requires a valid Bearer token, and for sales reps specifically,
// verifies the requested customer is actually one of THEIR OWN clients
// before returning anything.

import { NextResponse } from 'next/server'
import { getWordPressUserDetails } from '@/lib/auth'

const WC_URL = process.env.NEXT_PUBLIC_WC_URL
const WC_KEY = process.env.WC_CONSUMER_KEY
const WC_SECRET = process.env.WC_CONSUMER_SECRET
const WP_URL = process.env.NEXT_PUBLIC_WP_URL

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

  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) {
    return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })
  }

  let caller: { role: string }
  try {
    caller = await getWordPressUserDetails(token)
  } catch {
    return NextResponse.json({ message: 'Invalid or expired session.' }, { status: 401 })
  }

  const { customerId } = await params

  if (caller.role === 'sales_rep') {
    const myClientsRes = await fetch(`${WP_URL}/wp-json/cellgenic/v1/my-clients`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    const myClients = myClientsRes.ok ? await myClientsRes.json() : []
    const myClientIds = new Set((myClients || []).map((c: any) => String(c.id)))
    if (!myClientIds.has(String(customerId))) {
      return NextResponse.json({ message: 'You do not have access to this client.' }, { status: 403 })
    }
  }

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
    // Full breakdown — matches the expandable order-details view.
    lineItems: o.line_items.map((item: any) => ({
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.quantity > 0 ? (parseFloat(item.total) / item.quantity) : 0,
      lineTotal: parseFloat(item.total),
      sku: item.sku || null,
    })),
    subtotal: o.line_items.reduce((sum: number, item: any) => sum + parseFloat(item.subtotal || item.total || '0'), 0),
    shippingMethod: (o.shipping_lines || [])[0]?.method_title || null,
    shippingCost: (o.shipping_lines || []).reduce((sum: number, s: any) => sum + parseFloat(s.total || '0'), 0),
    paymentMethod: o.payment_method_title || o.payment_method || null,
    placedBy: (o.meta_data || []).find((m: any) => m.key === '_placed_by_rep')?.value || null,
  }))

  return NextResponse.json(mapped)
}
