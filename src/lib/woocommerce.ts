// ─────────────────────────────────────────────────────────────────────
// CellGenic Portal — WooCommerce API Client
// File: src/lib/woocommerce.ts
// ─────────────────────────────────────────────────────────────────────

const WC_URL = process.env.NEXT_PUBLIC_WC_URL
const WC_KEY = process.env.WC_CONSUMER_KEY
const WC_SECRET = process.env.WC_CONSUMER_SECRET

async function wcFetch(endpoint: string, options: RequestInit = {}) {
  const credentials = Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64')
  const url = `${WC_URL}/wp-json/wc/v3${endpoint}`

  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.message || `WooCommerce API error: ${res.status}`)
  }

  return res.json()
}

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
export async function getAllProducts() {
  const products = await wcFetch('/products?per_page=100&status=publish&stock_status=instock')
  return products.map((p: any) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    price: p.price,
    stock_status: p.stock_status,
    categories: p.categories.map((c: any) => c.name),
    variations: p.variations,
  }))
}

export async function getProductVariations(productId: number) {
  return wcFetch(`/products/${productId}/variations?per_page=50`)
}


// ─────────────────────────────────────────────
// ORDERS
// ─────────────────────────────────────────────
export async function getClientOrders(customerId: number) {
  const orders = await wcFetch(`/orders?customer=${customerId}&per_page=50&orderby=date&order=desc`)
  return orders.map((o: any) => ({
    id: o.id,
    number: `#CG-${o.number}`,
    date: new Date(o.date_created).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    status: o.status,
    total: `$${parseFloat(o.total).toLocaleString()}`,
    products: o.line_items.map((item: any) => `${item.name} × ${item.quantity}`).join(', '),
  }))
}

export async function getRepRecentOrders(customerIds: number[]) {
  if (customerIds.length === 0) return []
  const ids = customerIds.join(',')
  return wcFetch(`/orders?customer=${ids}&per_page=20&orderby=date&order=desc&status=completed,processing`)
}

export async function placeOrderForClient(params: {
  customerId: number
  productId: number
  variationId?: number
  quantity: number
  shippingMethod: 'standard' | 'overnight'
  repNote?: string
}) {
  const lineItem: any = {
    product_id: params.productId,
    quantity: params.quantity,
  }
  if (params.variationId) {
    lineItem.variation_id = params.variationId
  }

  const shippingLine = params.shippingMethod === 'overnight'
    ? { method_id: 'flat_rate', method_title: 'Overnight (Dry Ice)', total: '250.00' }
    : { method_id: 'flat_rate', method_title: 'Standard Shipping', total: '60.00' }

  return wcFetch('/orders', {
    method: 'POST',
    body: JSON.stringify({
      customer_id: params.customerId,
      status: 'processing',
      line_items: [lineItem],
      shipping_lines: [shippingLine],
      meta_data: params.repNote
        ? [{ key: '_placed_by_rep', value: params.repNote }]
        : [],
    }),
  })
}


// ─────────────────────────────────────────────
// CLIENTS (via custom CellGenic endpoints)
// ─────────────────────────────────────────────
export async function getMyClients(token: string) {
  return cgFetch('/my-clients', token)
}

export async function getAllClients(token: string) {
  return cgFetch('/all-clients', token)
}

export async function getUnassignedClients(token: string) {
  return cgFetch('/all-clients', token).then((clients: any[]) =>
    clients.filter(c => !c.assigned_rep_code)
  )
}

export async function assignClientToRep(token: string, userId: number, repCode: string) {
  return cgFetch('/assign-client', token, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, rep_code: repCode }),
  })
}


// ─────────────────────────────────────────────
// PROVIDER APPROVALS
// ─────────────────────────────────────────────
export async function getPendingProviders(token: string) {
  return cgFetch('/pending-providers', token)
}

export async function approveProvider(token: string, userId: number) {
  return cgFetch('/approve-provider', token, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId }),
  })
}

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

// Get a single rep's full editable details
export async function getSingleRep(token: string, repId: number) {
  return cgFetch(`/reps/${repId}`, token)
}

// Update a rep's details (name, email, rep code, phone)
export async function updateRep(token: string, repId: number, data: {
  name?: string
  email?: string
  rep_code?: string
  phone?: string
}) {
  return cgFetch(`/reps/${repId}`, token, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}


// ─────────────────────────────────────────────
// MY COMMISSIONS (rep)
// ─────────────────────────────────────────────
export async function getMyCommissions(token: string) {
  return cgFetch('/my-commissions', token)
}

export async function approveCommission(token: string, repId: number) {
  return cgFetch('/approve-commission', token, {
    method: 'POST',
    body: JSON.stringify({ rep_id: repId }),
  })
}


// ─────────────────────────────────────────────
// MY REFERRAL STATS (rep)
// ─────────────────────────────────────────────
export async function getMyReferralStats(token: string) {
  return cgFetch('/my-referral-stats', token)
}

// ─────────────────────────────────────────────
// LEADERBOARD — accessible by all roles (rep, manager, admin)
// Uses a separate endpoint that doesn't expose revenue/commission data
// ──────────────────────────────────
export async function getLeaderboard(token: string) {
  return cgFetch('/leaderboard', token)
}
