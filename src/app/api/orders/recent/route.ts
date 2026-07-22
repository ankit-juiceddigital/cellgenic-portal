// File: src/app/api/orders/recent/route.ts
//
// Server-side proxy for fetching recent WooCommerce orders across
// multiple customer IDs (used for a rep's dashboard).
//
// NOTE: WooCommerce's REST API `customer` param only accepts a single
// integer, not a comma-separated list ("Invalid parameter(s): customer"
// otherwise) — so this fetches one customer at a time in parallel and
// merges + re-sorts the results, rather than one multi-customer request.

import { NextResponse } from 'next/server'

const WC_URL = process.env.NEXT_PUBLIC_WC_URL
const WC_KEY = process.env.WC_CONSUMER_KEY
const WC_SECRET = process.env.WC_CONSUMER_SECRET

async function fetchOrdersForCustomer(customerId: string, headers: Record<string, string>) {
  const res = await fetch(
    `${WC_URL}/wp-json/wc/v3/orders?customer=${customerId}&per_page=20&orderby=date&order=desc&status=completed,processing`,
    { headers, cache: 'no-store' }
  )
  if (!res.ok) return []
  return res.json()
}

export async function GET(request: Request) {
  if (!WC_URL || !WC_KEY || !WC_SECRET) {
    return NextResponse.json(
      { message: 'WooCommerce environment variables are not configured on the server.' },
      { status: 500 }
    )
  }

  const { searchParams } = new URL(request.url)
  const customers = searchParams.get('customers')

  if (!customers) {
    return NextResponse.json([])
  }

  const credentials = Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64')
  const headers = {
    'Authorization': `Basic ${credentials}`,
    'Content-Type': 'application/json',
  }

  const ids = customers.split(',').filter(Boolean)

  try {
    const results = await Promise.all(ids.map(id => fetchOrdersForCustomer(id, headers)))
    const orders = results.flat()
    orders.sort((a: any, b: any) => new Date(b.date_created).getTime() - new Date(a.date_created).getTime())
    return NextResponse.json(orders.slice(0, 20))
  } catch (err: any) {
    return NextResponse.json(
      { message: err.message || 'WooCommerce API error' },
      { status: 500 }
    )
  }
}

