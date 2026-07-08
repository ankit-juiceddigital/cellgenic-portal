// src/lib/docusign-auth.ts
//
// Generates a DocuSign access token via JWT Grant and caches it in memory
// until shortly before it expires. Import getDocuSignAccessToken() wherever
// you currently use process.env.DOCUSIGN_ACCESS_TOKEN.

import jwt from 'jsonwebtoken'

const INTEGRATION_KEY = process.env.DOCUSIGN_INTEGRATION_KEY! // Client ID from Apps & Keys
const USER_ID = process.env.DOCUSIGN_USER_ID! // GUID of the impersonated/system user
const PRIVATE_KEY = process.env.DOCUSIGN_PRIVATE_KEY!.replace(/\\n/g, '\n') // RSA private key (PEM)
const AUTH_SERVER = process.env.DOCUSIGN_AUTH_SERVER || 'account.docusign.com' // 'account-d.docusign.com' for demo/sandbox

let cachedToken: { token: string; expiresAt: number } | null = null

async function requestNewToken(): Promise<{ token: string; expiresAt: number }> {
  const now = Math.floor(Date.now() / 1000)

  // Best practice: keep the JWT itself short-lived (it's just used once,
  // immediately, to request the access token) — 60 seconds is plenty.
  const assertion = jwt.sign(
    {
      iss: INTEGRATION_KEY,
      sub: USER_ID,
      aud: AUTH_SERVER,
      iat: now,
      exp: now + 60,
      scope: 'signature impersonation',
    },
    PRIVATE_KEY,
    { algorithm: 'RS256' }
  )

  const res = await fetch(`https://${AUTH_SERVER}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })

  const data = await res.json()

  if (!res.ok) {
    // consent_required means the impersonated user hasn't granted consent yet.
    // See the one-time consent URL instructions — this has to be done once
    // in a browser before JWT Grant will work for that user.
    throw new Error(`DocuSign auth failed: ${data.error || res.statusText}`)
  }

  return {
    token: data.access_token,
    // data.expires_in is in seconds (typically 3600). Refresh 5 minutes early.
    expiresAt: Date.now() + (data.expires_in - 300) * 1000,
  }
}

export async function getDocuSignAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token
  }
  cachedToken = await requestNewToken()
  return cachedToken.token
}