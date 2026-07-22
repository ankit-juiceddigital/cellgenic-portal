// File: src/app/api/customers/[id]/route.ts
//
// Server-side proxy for fetching a single WooCommerce customer's
// name / email / country. Used by the DocuSign consent buttons on the
// client detail page (they need an email address to send the envelope to,
// and a country to decide whether consent forms apply at all).

import { NextResponse } from 'next/server'

const WC_URL = process.env.NEXT_PUBLIC_WC_URL
const WC_KEY = process.env.WC_CONSUMER_KEY
const WC_SECRET = process.env.WC_CONSUMER_SECRET

export async function GET(
  _request: Request,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  if (!WC_URL || !WC_KEY || !WC_SECRET) {
    return NextResponse.json(
      { error: 'WooCommerce credentials not configured.' },
      { status: 500 }
    )
  }

  const { id: customerId } = await params
  if (!customerId || isNaN(Number(customerId))) {
    return NextResponse.json({ error: 'Invalid customer ID.' }, { status: 400 })
  }

  const credentials = Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64')

  try {
    const res = await fetch(`${WC_URL}/wp-json/wc/v3/customers/${customerId}`, {
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

    const c = await res.json()

    return NextResponse.json({
      id: c.id,
      name: `${c.first_name} ${c.last_name}`.trim() || c.username,
      email: c.email,
      phone: c.billing?.phone || '',
      country: c.billing?.country || c.shipping?.country || '',
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch customer.' },
      { status: 500 }
    )
  }
}
