// src/lib/docusign-auth.ts
// Generates a DocuSign access token via JWT Grant and caches it in memory
// until shortly before it expires. Import getDocuSignAccessToken() wherever
// you currently use process.env.DOCUSIGN_ACCESS_TOKEN.

import jwt from 'jsonwebtoken'

// BUILD FIX: these were read at module scope, and PRIVATE_KEY called
// .replace() on the raw value. When DOCUSIGN_PRIVATE_KEY is unset — which
// it is on any machine that hasn't configured DocuSign — that threw
// "Cannot read properties of undefined (reading 'replace')" while Next
// collected page data, and `npm run build` failed for the WHOLE app over
// one unconfigured integration.
//
// Reading them inside the function means a missing key is a clear runtime
// error on the DocuSign routes only, and the rest of the portal builds and
// runs fine without DocuSign configured at all.
function docusignConfig() {
  const INTEGRATION_KEY = process.env.DOCUSIGN_INTEGRATION_KEY // Client ID from Apps & Keys
  const USER_ID = process.env.DOCUSIGN_USER_ID // GUID of the impersonated/system user
  const RAW_KEY = process.env.DOCUSIGN_PRIVATE_KEY // RSA private key (PEM)
  const AUTH_SERVER = process.env.DOCUSIGN_AUTH_SERVER || 'account.docusign.com' // 'account-d.docusign.com' for demo/sandbox

  const missing = [
    !INTEGRATION_KEY && 'DOCUSIGN_INTEGRATION_KEY',
    !USER_ID && 'DOCUSIGN_USER_ID',
    !RAW_KEY && 'DOCUSIGN_PRIVATE_KEY',
  ].filter(Boolean)

  if (missing.length) {
    throw new Error(`DocuSign is not configured — missing: ${missing.join(', ')}.`)
  }

  return {
    INTEGRATION_KEY: INTEGRATION_KEY as string,
    USER_ID: USER_ID as string,
    // The PEM arrives from the env with literal \n sequences.
    PRIVATE_KEY: (RAW_KEY as string).replace(/\\n/g, '\n'),
    AUTH_SERVER,
  }
}

let cachedToken: { token: string; expiresAt: number } | null = null

async function requestNewToken(): Promise<{ token: string; expiresAt: number }> {
  const { INTEGRATION_KEY, USER_ID, PRIVATE_KEY, AUTH_SERVER } = docusignConfig()
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