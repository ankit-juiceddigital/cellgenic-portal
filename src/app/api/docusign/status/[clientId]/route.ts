// File: src/app/api/docusign/status/[clientId]/route.ts
//
// Returns the persisted DocuSign consent status (sent / signed) for a
// client, so the "Signed ✅" state on the client profile survives a
// page reload instead of only living in React state.
// Backed by the cellgenic/v1/verify-consent WordPress REST route
// (see wordpress/cellgenic-docusign-consent.php in this delivery).

import { NextResponse } from 'next/server'

const WP_URL = process.env.NEXT_PUBLIC_WP_URL
const CELLGENIC_SERVICE_TOKEN = process.env.CELLGENIC_SERVICE_TOKEN

export async function GET(
  _request: Request,
  { params }: { params: { clientId: string } }
) {
  if (!WP_URL || !CELLGENIC_SERVICE_TOKEN) {
    return NextResponse.json({ research: null, cosmetic: null })
  }

  try {
    const res = await fetch(
      `${WP_URL}/wp-json/cellgenic/v1/verify-consent?client_id=${params.clientId}`,
      {
        headers: { Authorization: `Bearer ${CELLGENIC_SERVICE_TOKEN}` },
        cache: 'no-store',
      }
    )
    if (!res.ok) return NextResponse.json({ research: null, cosmetic: null })
    return NextResponse.json(await res.json())
  } catch {
    return NextResponse.json({ research: null, cosmetic: null })
  }
}
