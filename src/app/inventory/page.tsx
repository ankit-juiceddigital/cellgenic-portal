'use client'
// File: src/app/inventory/page.tsx
//
// Part of Requirement 7 — the admin platform becomes a complete
// management dashboard, including inventory visibility. Now backed by
// the live CellGenic Ops inventory API (real-time warehouse stock),
// not WooCommerce's coarse in-stock/out-of-stock flag.
//
// Location names shown here are already sanitized server-side by
// /api/inventory — this page never sees or renders raw warehouse
// codes/cities (see that route for the brand-rule reasoning).

import { useState, Fragment } from 'react'
import { useInventory } from '@/hooks/useData'
import { Topbar } from '@/components/layout/Topbar'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { TableSkeleton, ErrorState } from '@/components/ui/Skeleton'
import { Search, ChevronDown, ChevronUp } from 'lucide-react'

function stockVariant(available: number): 'teal' | 'amber' | 'red' {
  if (available <= 0) return 'red'
  if (available < 20) return 'amber'
  return 'teal'
}

export default function InventoryPage() {
  const { data: products, loading, error, refetch } = useInventory()
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const filtered = (products || []).filter((p: any) =>
    p.name?.toLowerCase().includes(query.toLowerCase()) ||
    p.sku?.toLowerCase().includes(query.toLowerCase())
  )

  const outOfStock = (products || []).filter((p: any) => (p.totalAvailable || 0) <= 0).length
  const lowStock = (products || []).filter((p: any) => (p.totalAvailable || 0) > 0 && p.totalAvailable < 20).length

  return (
    <>
      <Topbar
        title="Inventory"
        subtitle="Live warehouse stock — updates in real time, never cached"
        actions={
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or SKU..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-brand w-56"
            />
          </div>
        }
      />
      <div className="p-4 md:p-7 space-y-4">
        {!loading && !error && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1.5">Total SKUs tracked</p>
              <p className="text-2xl font-semibold text-gray-900">{products?.length || 0}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1.5">Out of stock</p>
              <p className="text-2xl font-semibold text-gray-900">{outOfStock}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 hidden md:block">
              <p className="text-xs text-gray-500 mb-1.5">Low stock (&lt;20 units)</p>
              <p className="text-2xl font-semibold text-gray-900">{lowStock}</p>
            </div>
          </div>
        )}

        {loading && <TableSkeleton />}
        {error && <ErrorState message={error} onRetry={refetch} />}
        {!loading && !error && (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Product', 'SKU', 'Total available', 'Availability', ''].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">
                        {query ? 'No products match your search.' : 'No inventory data found.'}
                      </td>
                    </tr>
                  ) : filtered.map((p: any) => (
                    <Fragment key={p.sku}>
                      <tr className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                        <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.sku}</td>
                        <td className="px-4 py-3 text-gray-600">{p.totalAvailable}</td>
                        <td className="px-4 py-3">
                          <Badge variant={stockVariant(p.totalAvailable)}>
                            {p.totalAvailable <= 0 ? 'Out of stock' : p.totalAvailable < 20 ? 'Low stock' : 'In stock'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {(p.stockByLocation || []).length > 0 && (
                            <button
                              onClick={() => setExpanded(prev => ({ ...prev, [p.sku]: !prev[p.sku] }))}
                              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700"
                            >
                              {expanded[p.sku] ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                              By location
                            </button>
                          )}
                        </td>
                      </tr>
                      {expanded[p.sku] && (
                        <tr className="bg-gray-50/50 border-b border-gray-50">
                          <td colSpan={5} className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              {(p.stockByLocation || []).map((loc: any) => (
                                <div
                                  key={loc.locationId}
                                  className="bg-white border border-gray-100 rounded-lg px-3 py-1.5 text-xs"
                                >
                                  <span className="font-medium text-gray-700">{loc.locationDisplay}</span>
                                  <span className="text-gray-400 ml-1.5">
                                    {loc.availableQuantity} available
                                  </span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </>
  )
}
