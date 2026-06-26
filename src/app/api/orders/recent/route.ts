// File: src/app/api/orders/recent/route.ts
//
// Server-side proxy for fetching recent WooCommerce orders across
// multiple customer IDs (used for a rep's dashboard).

import { NextResponse } from 'next/server'

const WC_URL = process.env.NEXT_PUBLIC_WC_URL
const WC_KEY = process.env.WC_CONSUMER_KEY
const WC_SECRET = process.env.WC_CONSUMER_SECRET

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

  const res = await fetch(
    `${WC_URL}/wp-json/wc/v3/orders?customer=${customers}&per_page=20&orderby=date&order=desc&status=completed,processing`,
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
  return NextResponse.json(orders)
}
