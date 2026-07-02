// File: src/app/api/products/route.ts
// Server-side route — credentials never exposed to the browser.
// Fetches ALL products using pagination (100 per page until exhausted).

import { NextResponse } from 'next/server'

// ─────────────────────────────────────────────
// In-memory cache — products are loaded ONCE and reused
// for 10 minutes before re-fetching from WooCommerce.
// This prevents 429 Too Many Requests from repeated calls.
// ─────────────────────────────────────────────
let cachedProducts: any[] | null = null
let cacheExpiry = 0
const CACHE_TTL = 10 * 60 * 1000 // 10 minutes in ms

export async function GET() {
  // Return cache if still valid
  if (cachedProducts && Date.now() < cacheExpiry) {
    return NextResponse.json(cachedProducts, {
      headers: { 'X-Cache': 'HIT' }
    })
  }

  const WC_URL = process.env.NEXT_PUBLIC_WC_URL
  const WC_KEY = process.env.WC_CONSUMER_KEY
  const WC_SECRET = process.env.WC_CONSUMER_SECRET

  if (!WC_URL || !WC_KEY || !WC_SECRET) {
    return NextResponse.json(
      { error: 'WooCommerce credentials not configured.' },
      { status: 500 }
    )
  }

  const credentials = Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64')
  const headers = { Authorization: `Basic ${credentials}` }

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  try {
    let allProducts: any[] = []
    let page = 1
    const perPage = 100

    while (true) {
      const url = `${WC_URL}/wp-json/wc/v3/products?per_page=${perPage}&page=${page}&status=publish&orderby=title&order=asc`

      // Retry up to 3 times on 429
      let res: Response | null = null
      for (let attempt = 1; attempt <= 3; attempt++) {
        res = await fetch(url, { headers, cache: 'no-store' })
        if (res.status !== 429) break
        await sleep(attempt * 1000) // 1s, 2s, 3s
      }

      if (!res || !res.ok) {
        if (cachedProducts) {
          return NextResponse.json(cachedProducts, { headers: { 'X-Cache': 'STALE' } })
        }
        const err = await res?.json().catch(() => ({}))
        return NextResponse.json(
          { error: err?.message || 'WC error ' + (res?.status || 500) },
          { status: res?.status || 500 }
        )
      }

      const products = await res.json()

      const mapped = products.map((p: any) => ({
        id: p.id,
        name: p.name,
        sku: p.sku || '',
        price: p.price || '0',
        stock_status: p.stock_status,
        categories: (p.categories || []).map((c: any) => c.name),
        variations: p.variations || [],
      }))

      allProducts = allProducts.concat(mapped)

      if (products.length < perPage) break
      page++
      if (page > 20) break

      // 300ms delay between pages to avoid rate limiting
      await sleep(300)
    }

    // Store in cache
    cachedProducts = allProducts
    cacheExpiry = Date.now() + CACHE_TTL

    return NextResponse.json(allProducts, {
      headers: { 'X-Cache': 'MISS' }
    })
  } catch (err: any) {
    // Return stale cache on error rather than failing
    if (cachedProducts) {
      return NextResponse.json(cachedProducts, {
        headers: { 'X-Cache': 'STALE' }
      })
    }
    return NextResponse.json(
      { error: err.message || 'Failed to fetch products.' },
      { status: 500 }
    )
  }
}
