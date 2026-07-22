// File: src/app/api/orders/by-customers/route.ts
// Server-side route — WC credentials never exposed to the browser.
//
// Given a comma-separated list of customer IDs, returns the FULL order
// history for those customers (no status filter, no arbitrary 20-row cap).
// Used by the Sales Representative detail page to compute:
//   - each assigned client's order amount + complete order history
//   - the rep's total sales (order count) and total revenue
//
// NOTE: WooCommerce's REST API `customer` param only accepts a single
// integer — "Invalid parameter(s): customer" if you pass a comma-joined
// list. So this fetches one customer at a time, in parallel batches, and
// merges results, rather than a single multi-customer request.

import { NextResponse } from 'next/server'

const WC_URL = process.env.NEXT_PUBLIC_WC_URL
const WC_KEY = process.env.WC_CONSUMER_KEY
const WC_SECRET = process.env.WC_CONSUMER_SECRET

async function fetchOrdersForCustomer(customerId: string, headers: Record<string, string>) {
  let orders: any[] = []
  const perPage = 100
  for (let page = 1; page <= 5; page++) {
    const url = `${WC_URL}/wp-json/wc/v3/orders?customer=${customerId}&per_page=${perPage}&page=${page}&orderby=date&order=desc`
    const res = await fetch(url, { headers, cache: 'no-store' })
    if (!res.ok) break
    const page_orders = await res.json()
    orders = orders.concat(page_orders)
    if (page_orders.length < perPage) break
  }
  return orders
}

export async function GET(request: Request) {
  if (!WC_URL || !WC_KEY || !WC_SECRET) {
    return NextResponse.json(
      { error: 'WooCommerce credentials not configured.' },
      { status: 500 }
    )
  }

  const { searchParams } = new URL(request.url)
  const customers = searchParams.get('customers')

  if (!customers) {
    return NextResponse.json([])
  }

  const credentials = Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64')
  const headers = { Authorization: `Basic ${credentials}` }

  const ids = customers.split(',').filter(Boolean)
  const BATCH_SIZE = 10

  try {
    let allOrders: any[] = []
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const batch = ids.slice(i, i + BATCH_SIZE)
      const results = await Promise.all(batch.map(id => fetchOrdersForCustomer(id, headers)))
      allOrders = allOrders.concat(...results)
    }

    const mapped = allOrders.map((o: any) => ({
      id: o.id,
      number: `#CG-${o.number}`,
      customer_id: o.customer_id,
      date: new Date(o.date_created).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      raw_date: o.date_created,
      status: o.status,
      total: parseFloat(o.total || '0'),
      total_formatted: `$${parseFloat(o.total || '0').toLocaleString()}`,
      products: (o.line_items || []).map((item: any) => `${item.name} × ${item.quantity}`).join(', '),
    }))

    return NextResponse.json(mapped)
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch orders.' },
      { status: 500 }
    )
  }
}

