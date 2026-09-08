'use client'
// File: src/app/orders/page.tsx
//
// Every order the caller is allowed to see. /api/orders/all already
// scopes reps to their own clients server-side, so there is no
// client-side filtering to trust here.

import { useMemo, useState } from 'react'
import { useFilters } from '@/lib/filter-context'
import { useUI } from '@/lib/ui-context'
import { usePortal } from '@/hooks/usePortal'
import { billedThisMonth, fmt, money, orderStatus } from '@/lib/portal-model'
import { ChevronRight } from '@/components/ui/Icons'

/** Statuses that mean the order is finished, for the "in progress" count. */
const CLOSED = ['completed', 'cancelled', 'refunded', 'failed']

export default function OrdersPage() {
  const { orders, providers, loading, error, refetch } = usePortal()
  const { openDrawer } = useUI()
  const { term } = useFilters()
  const [statusFilter, setStatusFilter] = useState<'active' | 'all'>('active')

  const rows = useMemo(() => {
    let list = orders
    if (statusFilter === 'active') list = list.filter(o => !CLOSED.includes(o.status))
    const q = term.trim().toLowerCase()
    if (q) {
      list = list.filter(o =>
        `${o.customerName} ${o.number} ${o.items.map(i => i.name).join(' ')}`.toLowerCase().includes(q))
    }
    return list.slice().sort((a, b) => b.date.getTime() - a.date.getTime())
  }, [orders, statusFilter, term])

  const total = orders.reduce((a, b) => a + b.total, 0)
  const inProgress = orders.filter(o => !CLOSED.includes(o.status)).length

  if (error) {
    return (
      <div className="panel">
        <div className="empty">
          <b>Could not load orders</b>{error}
          <div style={{ marginTop: 14 }}>
            <button className="btn btn-sm" onClick={() => refetch()}>Try again</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="stats">
        <div className="stat">
          <span className="v mono">{orders.length}</span>
          <span className="l">Orders recorded</span>
        </div>
        <div className="stat good">
          <span className="v mono">{money(total)}</span>
          <span className="l">Total value</span>
        </div>
        <div className="stat">
          <span className="v mono">{inProgress}</span>
          <span className="l">In progress</span>
        </div>
        <div className="stat">
          <span className="v mono">{money(billedThisMonth(orders))}</span>
          <span className="l">Billed this month</span>
        </div>
      </div>

      <div className="bar">
        <div className="seg">
          <button className={statusFilter === 'active' ? 'on' : ''} onClick={() => setStatusFilter('active')}>
            In progress
          </button>
          <button className={statusFilter === 'all' ? 'on' : ''} onClick={() => setStatusFilter('all')}>
            All orders
          </button>
        </div>
        <span className="spacer" />
        {/* No CSV export, deliberately — see the no-download note on the
            Reps page. The old portal had one; the new design forbids it. */}
      </div>

      <div className="panel">
        <div className="panel-h">
          <h3>{statusFilter === 'active' ? 'Orders in progress' : 'All orders'}</h3>
          <span className="c">{rows.length}</span>
        </div>

        {loading ? (
          <div className="empty">Loading orders…</div>
        ) : rows.length ? rows.map(o => {
          const stat = orderStatus(o.status)
          const client = providers.find(p => p.id === o.customerId)
          return (
            <button key={o.id} className="li" onClick={() => openDrawer({ kind: 'o', id: o.id })}>
              <span className="ini mono">#{String(o.number).slice(-2)}</span>
              <span className="grow">
                <span className="t">{client?.n || o.customerName}</span>
                <span className="s">
                  Order {o.number} · {fmt(o.date)} · {o.items.length} product{o.items.length === 1 ? '' : 's'}
                  {o.placedBy ? ` · placed by ${o.placedBy}` : ''}
                </span>
              </span>
              <span className="mono" style={{ fontWeight: 600, flex: '0 0 auto' }}>{money(o.total)}</span>
              <span className={`pill ${stat.k}`}>{stat.t}</span>
              <ChevronRight />
            </button>
          )
        }) : (
          <div className="empty">
            <b>No orders</b>
            {statusFilter === 'active' ? 'Nothing is in progress right now.' : 'No orders match this search.'}
          </div>
        )}
      </div>
    </>
  )
}
