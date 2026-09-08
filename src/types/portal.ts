// File: src/types/portal.ts
// Data model for the activation-window portal. Field names deliberately
// mirror the approved HTML prototype's shorthand (n / e / p / c / cc /
// acc / last / orders / rev / stage) so the render functions ported from
// it stay readable side-by-side with the original.

export type Role = 'sales_rep' | 'sales_manager' | 'administrator'

/** Pipeline stage — stored on the WP user as `cellgenic_pipeline_stage`. */
export type Stage = 'new' | 'cont' | 'quote' | 'noresp' | 'act' | 'dead'

/** Derived from the 30-day window, never stored. */
export type Bucket = 'urg' | 'warn' | 'ok' | 'act' | 'dead'

export interface Provider {
  /** WordPress user ID — the real key. `i` below is only an array index. */
  id: number
  /** Array index, assigned by enrich(). Used by the drawer refs (`p:3`). */
  i: number

  n: string          // name
  e: string          // email
  p: string          // phone
  c: string          // country display name
  cc: string         // ISO-2 country code, for the flag
  clinic: string | null

  rep: string | null      // assigned rep display name
  repCode: string | null  // referal_linkcode

  acc: Date | null   // access granted (cellgenic_access_granted_at)
  last: Date | null  // last order date
  orders: number     // lifetime order count
  rev: number        // lifetime revenue

  stage: Stage
  vip: boolean
  tag: string | null       // e.g. "Institutional"
  accountStatus: string    // approved | deactivated | awaiting_admin_review | rejected
  extendedDays: number     // total days added via "Extend window"

  // ── computed by enrich() ──
  elapsed: number    // days since access granted
  left: number       // days left in the window (can be negative)
  closes: Date | null
  bucket: Bucket
}

export interface OrderLine {
  name: string
  sku: string | null
  quantity: number
  unitPrice: number
  lineTotal: number
}

export interface Order {
  id: number
  number: string           // "#CG-4824"
  customerId: number
  customerName: string
  date: Date
  status: string           // raw WooCommerce status
  total: number
  items: OrderLine[]
  itemCount: number
  subtotal: number
  shippingMethod: string | null
  shippingCost: number
  placedBy: string | null
  paymentMethod: string | null
  billingCountry: string | null
}

export interface Approval {
  id: number
  n: string
  e: string
  p: string
  c: string
  cc: string
  req: Date               // submitted
  note: string            // derived review note
  doc: string             // documents summary
  docUrl: string | null
  hasDocument: boolean
  referralCode: string | null
  providerRole: string | null
  years: string | null
  volume: string | null
  setup: string | null
  pillars: string | null
  investment: string | null
  message: string | null
}

export interface Rep {
  id: number
  name: string
  email: string
  repCode: string | null
  role: Role
  isAlsoRep: boolean
  clients: number
  ordersMonth: number
  revenue: string
  commission: string
  trend: string
}

/** Per-rep figures computed client-side from the enriched provider list. */
export interface RepStats {
  r: string
  id: number | null
  mine: Provider[]
  total: number
  act: number
  urg: number
  rev: number
  ord: number
  rate: number
}

export type DrawerRef =
  | { kind: 'p'; id: number }
  | { kind: 'o'; id: number }
  | { kind: 'a'; id: number }
  | { kind: 'r'; id: number }

export interface DrawerFrame {
  ref: DrawerRef
  label: string
}
