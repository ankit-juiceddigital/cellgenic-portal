// File: src/app/api/docusign/webhook/route.ts
//
// Receives the "Envelope Completed" notification from DocuSign Connect
// (see Part F of the build guide), downloads the signed PDF, and saves
// it to the client's WordPress profile.
//
// DocuSign Admin → Connect → set the webhook URL to:
//   https://portal.cellgenic.com/api/docusign/webhook
// and enable the "Envelope Completed" trigger.

import { NextResponse } from 'next/server'

//const DOCUSIGN_BASE_URL = 'https://na4.docusign.net/restapi'
const DOCUSIGN_BASE_URL = 'https://demo.docusign.net/restapi'
const DOCUSIGN_ACCOUNT_ID = process.env.DOCUSIGN_ACCOUNT_ID
const DOCUSIGN_ACCESS_TOKEN = process.env.DOCUSIGN_ACCESS_TOKEN

// Shared secret configured on both sides in DocuSign Admin → Connect →
// "Use HMAC" — protects this endpoint from spoofed webhook calls.
// If left unset, signature verification is skipped (not recommended for prod).
const DOCUSIGN_CONNECT_HMAC_KEY = process.env.DOCUSIGN_CONNECT_HMAC_KEY

// Used to authenticate this server's write-back call to WordPress.
const WP_URL = process.env.NEXT_PUBLIC_WP_URL
const CELLGENIC_SERVICE_TOKEN = process.env.CELLGENIC_SERVICE_TOKEN

async function verifyHmac(rawBody: string, signatureHeader: string | null) {
  if (!DOCUSIGN_CONNECT_HMAC_KEY) return true // not configured — skip (see note above)
  if (!signatureHeader) return false

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(DOCUSIGN_CONNECT_HMAC_KEY),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sigBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody))
  const computed = Buffer.from(sigBuffer).toString('base64')
  return computed === signatureHeader
}

function getCustomField(envelope: any, name: string): string | null {
  const fields = envelope?.customFields?.textCustomFields || envelope?.customFields || []
  const match = Array.isArray(fields)
    ? fields.find((f: any) => f.name === name)
    : null
  return match?.value ?? null
}

export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-docusign-signature-1')

  const valid = await verifyHmac(rawBody, signature)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 401 })
  }

  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  // DocuSign Connect's "aggregate" JSON payload shape.
  const envelopeStatus = payload?.data?.envelopeSummary?.status || payload?.status
  const envelopeId = payload?.data?.envelopeId || payload?.envelopeId

  if (envelopeStatus !== 'completed' || !envelopeId) {
    // Not a completed-envelope event — acknowledge and ignore.
    return NextResponse.json({ ignored: true })
  }

  const envelopeSummary = payload?.data?.envelopeSummary
  const clientId = getCustomField(envelopeSummary, 'clientId')
  const formType = getCustomField(envelopeSummary, 'formType')

  if (!clientId) {
    console.error('DocuSign webhook: completed envelope had no clientId custom field', envelopeId)
    return NextResponse.json({ error: 'Missing clientId custom field on envelope.' }, { status: 422 })
  }

  if (!DOCUSIGN_ACCOUNT_ID || !DOCUSIGN_ACCESS_TOKEN) {
    return NextResponse.json({ error: 'DocuSign credentials not configured.' }, { status: 500 })
  }

  try {
    // 1. Download the combined signed PDF from DocuSign
    const docRes = await fetch(
      `${DOCUSIGN_BASE_URL}/v2.1/accounts/${DOCUSIGN_ACCOUNT_ID}/envelopes/${envelopeId}/documents/combined`,
      { headers: { Authorization: `Bearer ${DOCUSIGN_ACCESS_TOKEN}` } }
    )
    if (!docRes.ok) {
      const err = await docRes.text()
      throw new Error(`Failed to download signed document from DocuSign: ${err}`)
    }
    const pdfBuffer = Buffer.from(await docRes.arrayBuffer())

    // 2. Push the signed PDF + envelope info to WordPress, which stores it
    //    as user meta on the client's profile and (optionally) triggers the
    //    Google Drive backup.
    if (!WP_URL || !CELLGENIC_SERVICE_TOKEN) {
      throw new Error('WordPress sync not configured (NEXT_PUBLIC_WP_URL / CELLGENIC_SERVICE_TOKEN).')
    }

    const form = new FormData()
    form.append('client_id', clientId)
    form.append('form_type', formType || 'unknown')
    form.append('envelope_id', envelopeId)
    form.append(
      'file',
      new Blob([pdfBuffer], { type: 'application/pdf' }),
      `consent-${formType || 'form'}-${envelopeId}.pdf`
    )

    const saveRes = await fetch(`${WP_URL}/wp-json/cellgenic/v1/save-consent`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${CELLGENIC_SERVICE_TOKEN}` },
      body: form,
    })

    if (!saveRes.ok) {
      const err = await saveRes.json().catch(() => ({}))
      throw new Error(err.message || `WordPress save-consent error: ${saveRes.status}`)
    }

    return NextResponse.json({ success: true, envelopeId, clientId })
  } catch (err: any) {
    console.error('DocuSign webhook error:', err)
    return NextResponse.json({ error: err.message || 'Webhook processing failed.' }, { status: 500 })
  }
}
