// ─────────────────────────────────────────────────────────────────────
// CellGenic Portal — WooCommerce API Client
// File: src/lib/woocommerce.ts
//
// IMPORTANT: This file is imported by Client Components (via src/hooks/useData.ts),
// which means anything in here runs in the BROWSER. WC_CONSUMER_KEY and
// WC_CONSUMER_SECRET must never be referenced here — only NEXT_PUBLIC_
// env vars are available client-side, and these two intentionally are not
// prefixed that way (they're WooCommerce write credentials).
//
// Product reads, variation reads, and order reads/writes are instead proxied
// through Next.js API routes (src/app/api/...), which run server-side and
// hold the real WC_CONSUMER_KEY / WC_CONSUMER_SECRET safely.
//
// HOW TO SET UP (unchanged):
// 1. In WordPress admin go to WooCommerce → Settings → Advanced → REST API
// 2. Click "Add Key"
// 3. Description: "CellGenic Portal"
// 4. User: your admin user
// 5. Permissions: Read/Write
// 6. Click "Generate API Key"
// 7. Copy the Consumer Key and Consumer Secret
// 8. Create a .env.local file in your Next.js project root with:
//
//    NEXT_PUBLIC_WC_URL=https://your-staging-url.hostingersite.com
//    WC_CONSUMER_KEY=ck_xxxxxxxxxxxxxxxxxxxxxxxx
//    WC_CONSUMER_SECRET=cs_xxxxxxxxxxxxxxxxxxxxxxxx
//    NEXT_PUBLIC_WP_URL=https://your-staging-url.hostingersite.com
//
// ─────────────────────────────────────────────────────────────────────

// Base fetch for our own internal API routes (no secrets here — those
// live server-side in src/app/api/.../route.ts)
async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const res = await fetch(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.message || `API error: ${res.status}`)
  }

  return res.json()
}

// Base authenticated fetch for custom CellGenic endpoints
async function cgFetch(endpoint: string, token: string, options: RequestInit = {}) {
  const url = `${process.env.NEXT_PUBLIC_WP_URL}/wp-json/cellgenic/v1${endpoint}`

  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.message || `API error: ${res.status}`)
  }

  return res.json()
}


// ─────────────────────────────────────────────
// PRODUCTS
// ─────────────────────────────────────────────

// Get all published products (for Place Order dropdown)
export async function getAllProducts() {
  return apiFetch('/api/products')
}

// Get product variations (vial sizes etc.)
export async function getProductVariations(productId: number) {
  return apiFetch(`/api/products/${productId}/variations`)
}


// ─────────────────────────────────────────────
// ORDERS
// ─────────────────────────────────────────────

// Get all orders for a specific customer (client detail page)
export async function getClientOrders(customerId: number) {
  return apiFetch(`/api/orders/client/${customerId}`)
}

// Get recent orders across all clients for a rep's dashboard
export async function getRepRecentOrders(customerIds: number[]) {
  if (customerIds.length === 0) return []
  const ids = customerIds.join(',')
  return apiFetch(`/api/orders/recent?customers=${ids}`)
}

// Place an order on behalf of a client
export async function placeOrderForClient(params: {
  customerId: number
  productId: number
  variationId?: number
  quantity: number
  shippingMethod: 'standard' | 'overnight'
  repNote?: string
}) {
  return apiFetch('/api/orders', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}


// ─────────────────────────────────────────────
// CLIENTS (via custom CellGenic endpoints)
// ─────────────────────────────────────────────

// Get clients assigned to the logged-in rep
export async function getMyClients(token: string) {
  return cgFetch('/my-clients', token)
}

// Get all clients (manager/admin)
export async function getAllClients(token: string) {
  return cgFetch('/all-clients', token)
}

// Get unassigned clients
export async function getUnassignedClients(token: string) {
  return cgFetch('/all-clients', token).then((clients: any[]) =>
    clients.filter(c => !c.assigned_rep)
  )
}

// Assign a client to a rep
export async function assignClientToRep(token: string, userId: number, repCode: string) {
  return cgFetch('/assign-client', token, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, rep_code: repCode }),
  })
}


// ─────────────────────────────────────────────
// PROVIDER APPROVALS
// ─────────────────────────────────────────────

// Get pending provider applications
export async function getPendingProviders(token: string) {
  return cgFetch('/pending-providers', token)
}

// Approve a provider
export async function approveProvider(token: string, userId: number) {
  return cgFetch('/approve-provider', token, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId }),
  })
}

// Reject a provider
export async function rejectProvider(token: string, userId: number) {
  return cgFetch('/reject-provider', token, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId }),
  })
}


// ─────────────────────────────────────────────
// SALES REPS (manager/admin)
// ─────────────────────────────────────────────

export async function getAllReps(token: string) {
  return cgFetch('/reps', token)
}
