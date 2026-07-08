// src/app/api/docusign/send/route.ts
import { NextResponse } from 'next/server'
import { getDocuSignAccessToken } from '@/lib/docusign-auth'

//const DOCUSIGN_BASE_URL = 'https://na4.docusign.net/restapi' // confirm this matches your account's base URI
const DOCUSIGN_BASE_URL = 'https://demo.docusign.net/restapi' // confirm this matches your account's base URI
const DOCUSIGN_ACCOUNT_ID = process.env.DOCUSIGN_ACCOUNT_ID

const TEMPLATES: Record<string, string | undefined> = {
  research: process.env.DOCUSIGN_TEMPLATE_RESEARCH,
  cosmetic: process.env.DOCUSIGN_TEMPLATE_COSMETIC,
}

export async function POST(request: Request) {
  const { clientName, clientEmail, formType } = await request.json()
  const templateId = TEMPLATES[formType]

  if (!templateId) {
    return NextResponse.json({ error: 'Invalid formType' }, { status: 400 })
  }

  let accessToken: string
  try {
    accessToken = await getDocuSignAccessToken()
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }

  const envelope = {
    templateId,
    templateRoles: [{ email: clientEmail, name: clientName, roleName: 'signer' }],
    status: 'sent',
  }

  const res = await fetch(
    `${DOCUSIGN_BASE_URL}/v2.1/accounts/${DOCUSIGN_ACCOUNT_ID}/envelopes`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(envelope),
    }
  )

  const data = await res.json()

  if (!res.ok) {
    return NextResponse.json({ error: data.message }, { status: res.status })
  }

  return NextResponse.json({ success: true, envelopeId: data.envelopeId })
}