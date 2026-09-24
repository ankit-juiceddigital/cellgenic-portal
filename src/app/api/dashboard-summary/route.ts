// Lightweight dashboard aggregate. Unlike /api/orders/all this route never
// returns line items or full order payloads; it only fetches the current
// month's minimal order fields and reduces them server-side.

import { NextResponse } from 'next/server'
import { getWordPressUserDetails } from '@/lib/auth'

const WC_URL = process.env.NEXT_PUBLIC_WC_URL
const WC_KEY = process.env.WC_CONSUMER_KEY
const WC_SECRET = process.env.WC_CONSUMER_SECRET
const WP_URL = process.env.NEXT_PUBLIC_WP_URL

const BILLABLE = new Set(['processing', 'completed'])

function monthBounds() {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0))
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0))
  return { after: start.toISOString(), before: end.toISOString() }
}

async function fetchMonthOrders(headers: Record<string, string>): Promise<any[] | null> {
  const { after, before } = monthBounds()
  const all: any[] = []
  for (let page = 1; page <= 10; page++) {
    const q = new URLSearchParams({
      per_page: '100',
      page: String(page),
      after,
      before,
      orderby: 'date',
      order: 'desc',
      _fields: 'id,customer_id,date_created,total,status',
    })
    const res = await fetch(`${WC_URL}/wp-json/wc/v3/orders?${q}`, {
      headers,
      cache: 'no-store',
    })
    if (!res.ok) return all.length ? all : null
    const rows = await res.json()
    all.push(...rows)
    if (rows.length < 100) break
  }
  return all
}

async function fetchMonthForCustomer(customerId: string, headers: Record<string, string>) {
  const { after, before } = monthBounds()
  const q = new URLSearchParams({
    customer: customerId,
    per_page: '100',
    after,
    before,
    orderby: 'date',
    order: 'desc',
    _fields: 'id,customer_id,date_created,total,status',
  })
  const res = await fetch(`${WC_URL}/wp-json/wc/v3/orders?${q}`, {
    headers,
    cache: 'no-store',
  })
  return res.ok ? res.json() : []
}

export async function GET(request: Request) {
  if (!WC_URL || !WC_KEY || !WC_SECRET || !WP_URL) {
    return NextResponse.json({ error: 'Dashboard data source is not configured.' }, { status: 500 })
  }

  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  let caller: { role: string }
  try {
    caller = await getWordPressUserDetails(token)
  } catch {
    return NextResponse.json({ error: 'Invalid or expired session.' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const requestedIds = (searchParams.get('customers') || '').split(',').filter(Boolean)
  const wantsAll = searchParams.get('mode') === 'all' && caller.role === 'administrator'

  // Never trust browser-supplied IDs for a sales rep. Resolve the allowed
  // portal client list from WordPress using the same authenticated token.
  let allowedIds = new Set(requestedIds)
  if (caller.role === 'sales_rep') {
    const clientRes = await fetch(`${WP_URL}/wp-json/cellgenic/v1/portal-clients`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!clientRes.ok) return NextResponse.json({ error: 'Could not verify client access.' }, { status: 403 })
    const payload = await clientRes.json()
    allowedIds = new Set((payload.clients || []).map((c: any) => String(c.id)))
  }

  const credentials = Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64')
  const headers = { Authorization: `Basic ${credentials}` }

  try {
    let raw = await fetchMonthOrders(headers)

    // Some WC API keys cannot list the full collection. Fall back to
    // per-customer requests, but only for the current month and minimal fields.
    if (raw === null) {
      const ids = Array.from(allowedIds)
      const BATCH = 10
      raw = []
      for (let i = 0; i < ids.length; i += BATCH) {
        const chunks = await Promise.all(ids.slice(i, i + BATCH).map(id => fetchMonthForCustomer(id, headers)))
        raw.push(...chunks.flat())
      }
    }

    const scoped = wantsAll
      ? raw
      : raw.filter((o: any) => allowedIds.has(String(o.customer_id)))

    const billable = scoped.filter((o: any) => BILLABLE.has(String(o.status)))
    const billed = billable.reduce((sum: number, o: any) => sum + Number(o.total || 0), 0)

    return NextResponse.json({
      billed_this_month: Math.round(billed * 100) / 100,
      orders_this_month: billable.length,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Could not load dashboard summary.' }, { status: 500 })
  }
}
