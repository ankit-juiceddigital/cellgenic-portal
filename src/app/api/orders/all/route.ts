// File: src/app/api/orders/all/route.ts
// Server-side route — WC credentials never exposed to the browser.
//
// Powers the "Orders" / "Recent Orders" page — a single, centralized
// list of every order placed on the platform.
//
// TWO MODES:
//
// 1. mode=all (admin only) — attempts an UNFILTERED GET /wc/v3/orders
//    (no customer param at all). This is the only way to see orders that
//    aren't tied to a known cellgenic_provider account (guest checkouts,
//    test orders placed as a plain WP user, etc.) — the customer-filtered
//    approach below silently misses those. If the WC REST API key
//    doesn't have permission for an unfiltered listing (some WooCommerce
//    setups reject this with "Sorry, you cannot list resources"), this
//    automatically falls back to mode 2 using whatever `customers` list
//    was also supplied, so the page never just breaks.
//
// 2. Default (reps / managers, or admin's fallback) — fetches orders
//    per known client ID, one customer at a time (WooCommerce's
//    `customer` param only accepts a single integer, not a
//    comma-separated list — "Invalid parameter(s): customer" otherwise),
//    in parallel batches, merged and sorted.

import { NextResponse } from 'next/server'

const WC_URL = process.env.NEXT_PUBLIC_WC_URL
const WC_KEY = process.env.WC_CONSUMER_KEY
const WC_SECRET = process.env.WC_CONSUMER_SECRET

function mapOrder(o: any) {
  return {
    id: o.id,
    number: `#CG-${o.number}`,
    customer_id: o.customer_id,
    customer_name: `${o.billing?.first_name || ''} ${o.billing?.last_name || ''}`.trim() || o.billing?.company || 'Unknown',
    date: new Date(o.date_created).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    raw_date: o.date_created,
    status: o.status,
    total: parseFloat(o.total || '0'),
    total_formatted: `$${parseFloat(o.total || '0').toLocaleString()}`,
    products: (o.line_items || []).map((item: any) => `${item.name} × ${item.quantity}`).join(', '),
  }
}

async function fetchOrdersForCustomer(customerId: string, headers: Record<string, string>) {
  let orders: any[] = []
  const perPage = 100
  for (let page = 1; page <= 5; page++) {
    const url = `${WC_URL}/wp-json/wc/v3/orders?customer=${customerId}&per_page=${perPage}&page=${page}&orderby=date&order=desc`
    const res = await fetch(url, { headers, cache: 'no-store' })
    if (!res.ok) break // skip this customer on error rather than failing the whole page
    const page_orders = await res.json()
    orders = orders.concat(page_orders)
    if (page_orders.length < perPage) break
  }
  return orders
}

async function fetchAllCustomerOrders(ids: string[], headers: Record<string, string>) {
  const BATCH_SIZE = 10
  let allOrders: any[] = []
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE)
    const results = await Promise.all(batch.map(id => fetchOrdersForCustomer(id, headers)))
    allOrders = allOrders.concat(...results)
  }
  return allOrders
}

// Attempts a truly unfiltered listing — every order on the store,
// regardless of whether it's tied to a known provider account. Returns
// null (rather than throwing) if the WC key doesn't have permission for
// this, so the caller can fall back cleanly.
async function tryFetchUnrestricted(headers: Record<string, string>): Promise<any[] | null> {
  let allOrders: any[] = []
  const perPage = 100
  for (let page = 1; page <= 20; page++) { // cap at 2000 orders per request
    const url = `${WC_URL}/wp-json/wc/v3/orders?per_page=${perPage}&page=${page}&orderby=date&order=desc`
    const res = await fetch(url, { headers, cache: 'no-store' })
    if (!res.ok) {
      // 401/403 here typically means the WC key isn't permitted to list
      // the full collection unfiltered — signal "not available" so the
      // caller falls back instead of erroring the whole page out.
      return allOrders.length > 0 ? allOrders : null
    }
    const page_orders = await res.json()
    allOrders = allOrders.concat(page_orders)
    if (page_orders.length < perPage) break
  }
  return allOrders
}

export async function GET(request: Request) {
  if (!WC_URL || !WC_KEY || !WC_SECRET) {
    return NextResponse.json(
      { error: 'WooCommerce credentials not configured.' },
      { status: 500 }
    )
  }

  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('mode')
  const customers = searchParams.get('customers')
  const credentials = Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64')
  const headers = { Authorization: `Basic ${credentials}` }

  try {
    let rawOrders: any[] | null = null
    let usedFallback = false

    if (mode === 'all') {
      rawOrders = await tryFetchUnrestricted(headers)
    }

    if (rawOrders === null) {
      // Either mode wasn't 'all', or the unrestricted attempt wasn't
      // permitted — fall back to the known-client-IDs approach.
      usedFallback = true
      if (!customers) {
        // No known clients yet (e.g. still loading) — empty state, not
        // an error.
        return NextResponse.json({ orders: [], usedFallback: true })
      }
      const ids = customers.split(',').filter(Boolean)
      rawOrders = await fetchAllCustomerOrders(ids, headers)
    }

    const mapped = rawOrders.map(mapOrder)
    mapped.sort((a, b) => new Date(b.raw_date).getTime() - new Date(a.raw_date).getTime())

    return NextResponse.json({ orders: mapped, usedFallback })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch orders.' },
      { status: 500 }
    )
  }
}
