// File: src/app/api/products/[id]/variations/route.ts
//
// Server-side proxy for WooCommerce product variations.
// Keeps WC_CONSUMER_KEY / WC_CONSUMER_SECRET server-only.

import { NextResponse } from 'next/server'

const WC_URL = process.env.NEXT_PUBLIC_WC_URL
const WC_KEY = process.env.WC_CONSUMER_KEY
const WC_SECRET = process.env.WC_CONSUMER_SECRET

export async function GET(
  request: Request,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  if (!WC_URL || !WC_KEY || !WC_SECRET) {
    return NextResponse.json(
      { message: 'WooCommerce environment variables are not configured on the server.' },
      { status: 500 }
    )
  }

  const { id } = await params
  const credentials = Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64')

  const res = await fetch(
    `${WC_URL}/wp-json/wc/v3/products/${id}/variations?per_page=50`,
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

  const variations = await res.json()
  return NextResponse.json(variations)
}
