// File: src/app/api/debug-providers/route.ts
// TEMPORARY debug route — DELETE after confirming the WP endpoint works.
// Visit /api/debug-providers in your browser (while logged in) to see what
// the WP endpoint actually returns.

import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const WP_URL = process.env.NEXT_PUBLIC_WP_URL
  const token = req.cookies.get('cellgenic_token')?.value

  if (!token) {
    return NextResponse.json({ error: 'Not logged in — no cellgenic_token cookie.' }, { status: 401 })
  }

  const url = `${WP_URL}/wp-json/cellgenic/v1/pending-providers`
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    })
    const raw = await res.text()
    return NextResponse.json({ status: res.status, ok: res.ok, url, raw_response: raw })
  } catch (err: any) {
    return NextResponse.json({ error: err.message, url })
  }
}