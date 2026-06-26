// ─────────────────────────────────────────────────────────────────────
// CellGenic Portal — WooCommerce API Client
// File: src/lib/woocommerce.ts
//
// HOW TO SET UP:
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

const WC_URL = process.env.NEXT_PUBLIC_WC_URL
const WC_KEY = process.env.WC_CONSUMER_KEY
const WC_SECRET = process.env.WC_CONSUMER_SECRET

// Base authenticated fetch for WooCommerce REST API
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

// Get product variations (vial sizes etc.)
export async function getProductVariations(productId: number) {
  return wcFetch(`/products/${productId}/variations?per_page=50`)
}


// ─────────────────────────────────────────────
// ORDERS
// ─────────────────────────────────────────────

// Get all orders for a specific customer (client detail page)
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

// Get recent orders across all clients for a rep's dashboard
export async function getRepRecentOrders(customerIds: number[]) {
  if (customerIds.length === 0) return []
  const ids = customerIds.join(',')
  return wcFetch(`/orders?customer=${ids}&per_page=20&orderby=date&order=desc&status=completed,processing`)
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
