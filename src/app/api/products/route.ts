// File: src/app/api/products/route.ts
// Server-side route that safely uses WC credentials (never exposed to the browser)

import { NextResponse } from 'next/server'

export async function GET() {
  const WC_URL = process.env.NEXT_PUBLIC_WC_URL
  const WC_KEY = process.env.WC_CONSUMER_KEY
  const WC_SECRET = process.env.WC_CONSUMER_SECRET

  if (!WC_URL || !WC_KEY || !WC_SECRET) {
    return NextResponse.json({ error: 'WooCommerce credentials not configured.' }, { status: 500 })
  }

  const credentials = Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64')
  const url = `${WC_URL}/wp-json/wc/v3/products?per_page=100&status=publish&stock_status=instock`

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Basic ${credentials}` },
      // Next.js: revalidate every 5 minutes so the list stays fresh without hammering WC
      next: { revalidate: 300 },
    })

    if (!res.ok) {
      const err = await res.json()
      return NextResponse.json({ error: err.message || `WC error ${res.status}` }, { status: res.status })
    }

    const products = await res.json()
    const mapped = products.map((p: any) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      price: p.price,
      stock_status: p.stock_status,
      categories: p.categories.map((c: any) => c.name),
      variations: p.variations,
    }))

    return NextResponse.json(mapped)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch products.' }, { status: 500 })
  }
}