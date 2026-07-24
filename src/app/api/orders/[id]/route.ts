// File: src/app/api/orders/[id]/route.ts
// Fetches full details of a single WooCommerce order by ID.
// Server-side only — WC credentials never reach the browser.
//
// SECURITY: this route previously had NO auth check at all — anyone who
// discovered/guessed an order ID could view its full details (customer
// name, email, phone, address, line items) regardless of role. Now it:
//   1. Requires a valid Bearer token (same WP JWT used everywhere else).
//   2. For sales reps specifically, verifies the order actually belongs
//      to one of THEIR OWN clients before returning anything — a rep
//      can no longer view another rep's order by changing the ID in the
//      request. Managers and admins are unrestricted, same as elsewhere.

import { NextResponse } from 'next/server'
import { getWordPressUserDetails } from '@/lib/auth'

const WP_URL = process.env.NEXT_PUBLIC_WP_URL

export async function GET(
  request: Request,
  { params }: { params: { id: string } | Promise<{ id: string }> }
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

  // Require the same Bearer token used for every other authenticated call.
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }

  let caller: { role: string; repCode?: string | null }
  try {
    caller = await getWordPressUserDetails(token)
  } catch {
    return NextResponse.json({ error: 'Invalid or expired session.' }, { status: 401 })
  }

  // `await` on a plain object just resolves immediately, so this is safe
  // whether params is sync (Next 14) or a Promise (Next 15+).
  const { id: orderId } = await params
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

    // Ownership check — reps only. Managers/admins can view any order,
    // same as they can see any client.
    if (caller.role === 'sales_rep') {
      const myClientsRes = await fetch(`${WP_URL}/wp-json/cellgenic/v1/my-clients`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      const myClients = myClientsRes.ok ? await myClientsRes.json() : []
      const myClientIds = (myClients || []).map((c: any) => c.id)

      if (!myClientIds.includes(order.customer_id)) {
        return NextResponse.json(
          { error: 'You do not have access to this order.' },
          { status: 403 }
        )
      }
    }

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
