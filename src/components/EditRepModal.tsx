'use client'

import { useState, useEffect } from 'react'
import { useSingleRep, useUpdateRep } from '@/hooks/useData'
import { Button } from '@/components/ui/Button'
import { X, Wand2 } from 'lucide-react'

interface EditRepModalProps {
  repId: number
  onClose: () => void
  onSaved: () => void
}

// Converts a full name into the rep-code convention used in referral
// links, e.g. "Dario Ramirez" -> "darioramirez" (matches
// https://cellgenic.com/register/?rep=darioramirez). Strips accents so
// "José Luis" -> "joseluis" rather than leaving the accented character in
// a URL param.
function slugifyName(name: string): string {
  return name
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents (é -> e)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // drop spaces, punctuation, everything but letters/numbers
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
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-gray-400">Rep code</label>
                <button
                  type="button"
                  onClick={() => name && setRepCode(slugifyName(name))}
                  disabled={!name}
                  className="flex items-center gap-1 text-xs text-brand hover:underline disabled:text-gray-300 disabled:no-underline disabled:cursor-not-allowed"
                >
                  <Wand2 size={11} /> Generate from name
                </button>
              </div>
              <input
                value={repCode}
                onChange={e => setRepCode(slugifyName(e.target.value))}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-brand font-mono"
                placeholder="e.g. darioramirez"
              />
              <p className="text-xs text-gray-400 mt-1">
                Used in this rep's referral link: cellgenic.com/register/?rep={repCode || '...'}
              </p>
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
