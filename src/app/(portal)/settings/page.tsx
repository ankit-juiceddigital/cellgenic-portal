'use client'

import { Topbar } from '@/components/layout/Topbar'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default function SettingsPage() {
  return (
    <>
      <Topbar title="Settings" subtitle="Platform configuration" />
      <div className="p-4 md:p-7">
        <Card padding className="max-w-md">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Commission settings</h2>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Default commission rate (%)</label>
              <input type="number" defaultValue={10} min={1} max={30} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-brand" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Payout schedule</label>
              <select className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-brand">
                <option>Monthly (1st of each month)</option>
                <option>Bi-weekly</option>
                <option>On approval</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Referral code format</label>
              <select className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-brand">
                <option>URL parameter (?rep=CODE)</option>
                <option>Manual code entry at registration</option>
                <option>Both</option>
              </select>
            </div>
            <Button variant="primary" className="w-full justify-center mt-2">Save settings</Button>
          </div>
        </Card>
      </div>
    </>
  )
}
