'use client'
// File: src/app/calculator/page.tsx
//
// Peptide Calculator — lets a sales rep pick a peptide (from real product
// data, via a dropdown — not a button), enter vial strength + reconstitution
// volume, and get back the concentration and the mL to draw for a target dose.

import { useState, useMemo } from 'react'
import { useProducts } from '@/hooks/useData'
import { Topbar } from '@/components/layout/Topbar'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Calculator as CalculatorIcon, Info, ExternalLink } from 'lucide-react'

// Public-facing calculator on the main site — kept in sync with the
// embedded version above, but with the full product catalog and FAQ.
const FULL_CALCULATOR_URL = 'https://cellgenic.com/peptide-calculator/'

export default function CalculatorPage() {
  const { data: products, loading: productsLoading } = useProducts()

  // Selected peptide (dropdown) — falls back to "custom" entry if not in catalog
  const [productId, setProductId] = useState<string>('')
  const [customName, setCustomName] = useState('')

  // Inputs
  const [vialAmountMg, setVialAmountMg] = useState<number>(5) // total peptide in the vial, mg
  const [waterMl, setWaterMl] = useState<number>(2)            // bacteriostatic water added, mL
  const [doseMcg, setDoseMcg] = useState<number>(250)          // desired dose, mcg

  const selectedProduct = useMemo(
    () => (products || []).find((p: any) => String(p.id) === productId),
    [products, productId]
  )

  const peptideLabel = productId === 'custom'
    ? (customName || 'Custom peptide')
    : (selectedProduct?.name || '')

  // ── Calculations ──
  const concentrationMgPerMl = waterMl > 0 ? vialAmountMg / waterMl : 0
  const concentrationMcgPerMl = concentrationMgPerMl * 1000
  const doseMl = concentrationMcgPerMl > 0 ? doseMcg / concentrationMcgPerMl : 0
  const doseUnits = doseMl * 100 // on a standard 100-unit (1mL) insulin syringe
  const dosesPerVial = doseMcg > 0 ? Math.floor((vialAmountMg * 1000) / doseMcg) : 0

  const isValid = vialAmountMg > 0 && waterMl > 0 && doseMcg > 0

  return (
    <>
      <Topbar
        title="Peptide Calculator"
        subtitle="Calculate reconstitution concentration and draw volume for a target dose"
      />
      <div className="p-7">
        <div className="max-w-md space-y-5">
          <Card padding>
            <div className="flex items-center gap-2 mb-4">
              <CalculatorIcon size={16} className="text-brand" />
              <h2 className="text-sm font-semibold text-gray-900">Dosing calculator</h2>
            </div>

            <div className="space-y-4">
              {/* Peptide dropdown */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Peptide</label>
                <select
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-brand"
                  value={productId}
                  onChange={e => setProductId(e.target.value)}
                  disabled={productsLoading}
                >
                  <option value="">
                    {productsLoading ? 'Loading peptides...' : 'Select a peptide...'}
                  </option>
                  {(products || []).map((p: any) => (
                    <option key={p.id} value={String(p.id)}>{p.name}</option>
                  ))}
                  <option value="custom">Custom / not listed...</option>
                </select>
              </div>

              {productId === 'custom' && (
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Custom peptide name</label>
                  <input
                    type="text"
                    value={customName}
                    onChange={e => setCustomName(e.target.value)}
                    placeholder="e.g. BPC-157"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-brand"
                  />
                </div>
              )}

              {/* Vial strength */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Vial strength (mg of peptide)</label>
                <input
                  type="number" min={0} step="0.1"
                  value={vialAmountMg}
                  onChange={e => setVialAmountMg(Number(e.target.value))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-brand"
                />
              </div>

              {/* Reconstitution volume */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Bacteriostatic water added (mL)</label>
                <input
                  type="number" min={0} step="0.1"
                  value={waterMl}
                  onChange={e => setWaterMl(Number(e.target.value))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-brand"
                />
              </div>

              {/* Desired dose */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Desired dose (mcg)</label>
                <input
                  type="number" min={0} step="1"
                  value={doseMcg}
                  onChange={e => setDoseMcg(Number(e.target.value))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-brand"
                />
              </div>
            </div>
          </Card>

          {/* Results */}
          <Card padding className={isValid ? '' : 'opacity-50'}>
            <h2 className="text-sm font-semibold text-gray-900 mb-3">
              Result {peptideLabel && <span className="text-gray-400 font-normal">— {peptideLabel}</span>}
            </h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm py-2 border-b border-gray-50">
                <span className="text-gray-500">Concentration</span>
                <span className="font-mono font-semibold text-gray-900">
                  {concentrationMcgPerMl.toFixed(0)} mcg/mL
                </span>
              </div>
              <div className="flex items-center justify-between text-sm py-2 border-b border-gray-50">
                <span className="text-gray-500">Draw volume per dose</span>
                <span className="font-mono font-semibold text-brand">
                  {doseMl.toFixed(3)} mL
                </span>
              </div>
              <div className="flex items-center justify-between text-sm py-2 border-b border-gray-50">
                <span className="text-gray-500">Syringe units (on 100-unit / 1mL syringe)</span>
                <span className="font-mono font-semibold text-gray-900">
                  {doseUnits.toFixed(1)} units
                </span>
              </div>
              <div className="flex items-center justify-between text-sm py-2">
                <span className="text-gray-500">Doses per vial</span>
                <span className="font-mono font-semibold text-gray-900">
                  {dosesPerVial}
                </span>
              </div>
            </div>
          </Card>

          {/* Open full calculator on website */}
          <a href={FULL_CALCULATOR_URL} target="_blank" rel="noopener noreferrer" className="inline-block">
            <Button variant="default" size="sm">
              <ExternalLink size={13} />
              Open full calculator on website
            </Button>
          </a>

          {/* Disclaimer */}
          <div className="flex items-start gap-2 text-xs text-gray-400 px-1">
            <Info size={13} className="mt-0.5 flex-shrink-0" />
            <p>
              For provider reference only. Always confirm dosing protocols against the product
              insert and the prescribing provider's instructions before advising a client.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
