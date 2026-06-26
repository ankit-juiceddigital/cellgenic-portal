export type Role = 'sales_rep' | 'sales_manager' | 'administrator'

export interface User {
  id: string
  name: string
  initials: string
  role: Role
  repCode?: string
}

export interface Client {
  id: number
  name: string
  clinic: string
  country: string
  rep: string
  repCode: string
  lastOrder: string
  totalOrders: number
  ltv: string
  status: 'active' | 'at-risk'
  risk: boolean
}

export interface Order {
  id: string
  date: string
  products: string
  amount: string
  status: 'fulfilled' | 'pending' | 'cancelled'
}

export interface Note {
  id: string
  type: 'call' | 'email' | 'note' | 'followup'
  author: string
  date: string
  text: string
}

export interface Rep {
  name: string
  code: string
  clients: number
  ordersMonth: number
  revenue: string
  commission: string
  trend: string
}

export interface UnassignedProvider {
  name: string
  clinic: string
  country: string
  registered: string
}

export interface CommissionEntry {
  client: string
  order: string
  sale: string
  rate: string
  amount: string
}
