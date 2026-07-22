// File: src/app/api/inventory/route.ts
// Server-side proxy for the CellGenic Ops inventory API (Roberto's
// system). Keeps the Bearer token server-only — never sent to the
// browser. Supports the same `sku` and `locationId` filters as the
// upstream API, passed straight through.
//
// Upstream docs (phase 1, read-only stock):
//   GET https://cellgenic-ops.vercel.app/api/v1/inventory
//   Header: Authorization: Bearer <CELLGENIC_OPS_API_KEY>
//
// Env vars needed (set in .env.local / Vercel project settings):
//   CELLGENIC_OPS_API_URL  — defaults to https://cellgenic-ops.vercel.app/api/v1/inventory
//   CELLGENIC_OPS_API_KEY  — the Bearer token
//
// IMPORTANT — brand rule enforcement: raw warehouse location names must
// NEVER reach the client (project brand rules: never reference Florida,
// Miami, or any U.S. state — "U.S.A." only). The upstream API returns
// locationCode/locationName as e.g. "MIA"/"Miami" — this route rewrites
// those to a sanitized display name BEFORE the response leaves the
// server, so the raw value never even exists in the browser's network
// tab, not just in what's rendered.

import { NextResponse } from 'next/server'

const OPS_URL = process.env.CELLGENIC_OPS_API_URL || 'https://cellgenic-ops.vercel.app/api/v1/inventory'
const OPS_KEY = process.env.CELLGENIC_OPS_API_KEY

// Confirmed mappings (from project notes): ARG, CUN (Mexico),
// MIA (U.S.A.), COL, BCN (Barcelona). MIA intentionally maps to
// "U.S.A." — never "Miami" or "Florida".
const LOCATION_DISPLAY_NAMES: Record<string, string> = {
  MIA: 'U.S.A.',
  ARG: 'Argentina',
  CUN: 'Mexico',
  COL: 'Colombia',
  BCN: 'Barcelona, Spain',
}

function sanitizeLocationName(locationCode: string): string {
  const code = (locationCode || '').toUpperCase()
  if (LOCATION_DISPLAY_NAMES[code]) {
    return LOCATION_DISPLAY_NAMES[code]
  }
  // Unmapped code — fall back to the code itself rather than guessing a
  // country from the raw name. Sarah still needs to confirm the display
  // rule for any warehouse location outside the five known ones.
  return code || 'Unknown location'
}

export async function GET(request: Request) {
  if (!OPS_KEY) {
    return NextResponse.json(
      { error: 'CELLGENIC_OPS_API_KEY is not configured on the server.' },
      { status: 500 }
    )
  }

  const { searchParams } = new URL(request.url)
  const sku = searchParams.get('sku')
  const locationId = searchParams.get('locationId')

  const upstreamUrl = new URL(OPS_URL)
  // An empty value (?sku=) should be treated as absent, per the API docs —
  // only forward the param if it actually has content.
  if (sku) upstreamUrl.searchParams.set('sku', sku)
  if (locationId) upstreamUrl.searchParams.set('locationId', locationId)

  try {
    const res = await fetch(upstreamUrl.toString(), {
      headers: { Authorization: `Bearer ${OPS_KEY}` },
      // Stock data is always-fresh per the API's own Cache-Control —
      // never cache this on our side either, to avoid overselling.
      cache: 'no-store',
    })

    // Per the docs: 401 = bad key, 503 = transient (retry), 500 = their
    // internal error, 200 = success including empty results.
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}))
      return NextResponse.json(
        { error: errBody.error || errBody.message || `Inventory API error: ${res.status}` },
        { status: res.status, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    const data = await res.json()

    // Sanitize BEFORE it ever leaves the server — raw locationCode /
    // locationName are dropped entirely, only the mapped display name
    // and the numbers survive.
    const sanitizedProducts = (data.products || []).map((p: any) => ({
      sku: p.sku,
      name: p.name,
      productId: p.productId,
      totalAvailable: p.totalAvailable,
      stockByLocation: (p.stockByLocation || []).map((loc: any) => ({
        locationId: loc.locationId,
        locationDisplay: sanitizeLocationName(loc.locationCode),
        availableQuantity: loc.availableQuantity,
        totalQuantity: loc.totalQuantity,
      })),
    }))

    return NextResponse.json(
      { products: sanitizedProducts },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to reach the inventory API.' },
      { status: 500 }
    )
  }
}
