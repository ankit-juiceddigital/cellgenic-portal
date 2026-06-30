'use client'

import { useState, useEffect } from 'react'
import { useSingleRep, useUpdateRep } from '@/hooks/useData'
import { Button } from '@/components/ui/Button'
import { X } from 'lucide-react'

interface EditRepModalProps {
  repId: number
  onClose: () => void
  onSaved: () => void
}

export function EditRepModal({ repId, onClose, onSaved }: EditRepModalProps) {
  const { data: rep, loading } = useSingleRep(repId)
  const { save, saving, error } = useUpdateRep()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [repCode, setRepCode] = useState('')
  const [phone, setPhone] = useState('')

  useEffect(() => {
    if (rep) {
      setName(rep.name || '')
      setEmail(rep.email || '')
      setRepCode(rep.rep_code || '')
      setPhone(rep.phone || '')
    }
  }, [rep])

  const handleSave = async () => {
    await save(
      repId,
      { name, email, rep_code: repCode, phone },
      () => {
        onSaved()
        onClose()
      }
    )
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
        >
          <X size={18} />
        </button>

        <h2 className="text-sm font-semibold text-gray-900 mb-4">Edit Sales Representative</h2>

        {loading ? (
          <p className="text-sm text-gray-400 py-6 text-center">Loading rep details...</p>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Full name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Email</label>
              <input
                value={email}
                onChange={e => setEmail(e.target.value)}
                type="email"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Rep code</label>
              <input
                value={repCode}
                onChange={e => setRepCode(e.target.value.toUpperCase())}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-brand font-mono"
                placeholder="e.g. JSANTOS"
              />
              <p className="text-xs text-gray-400 mt-1">Used to match clients who register via this rep's referral link.</p>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Phone (optional)</label>
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-brand"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600">
                {error}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="primary" onClick={handleSave} disabled={saving} className="flex-1 justify-center">
                {saving ? 'Saving...' : 'Save changes'}
              </Button>
              <Button onClick={onClose} disabled={saving}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
