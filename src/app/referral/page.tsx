'use client'

import { useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Copy, Mail, MessageCircle, QrCode, Check } from 'lucide-react'

export default function ReferralPage() {
  const [copied, setCopied] = useState(false)
  const referralUrl = 'cellgenic.com/register/?rep=JSANTOS'

  const handleCopy = () => {
    navigator.clipboard.writeText('https://' + referralUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <Topbar title="My Referral Link" subtitle="Share your unique link to register new providers" />
      <div className="p-7">
        <div className="max-w-lg space-y-5">
          {/* Referral URL card */}
          <Card padding>
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Your referral link</h2>
            <p className="text-sm text-gray-400 mb-4">
              When a provider registers via your link, they're automatically assigned to you. No code for them to type.
            </p>
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-100">
              <span className="text-xs font-mono text-gray-500 flex-1 truncate">{referralUrl}</span>
              <Button size="sm" onClick={handleCopy}>
                {copied ? <Check size={13} className="text-brand" /> : <Copy size={13} />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Your rep code: <span className="font-mono font-semibold text-gray-600">JSANTOS</span> · 4 providers registered via this link
            </p>
          </Card>

          {/* Share options */}
          <Card padding>
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Share via</h2>
            <div className="flex gap-2">
              <Button>
                <Mail size={14} /> Email template
              </Button>
              <Button>
                <MessageCircle size={14} /> WhatsApp
              </Button>
              <Button>
                <QrCode size={14} /> QR code
              </Button>
            </div>
          </Card>

          {/* Stats */}
          <Card padding>
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Registration activity</h2>
            <div className="space-y-2">
              {[
                { label: 'Dr. Maria Gonzalez', date: 'Mar 5, 2026', status: 'Active' },
                { label: 'Dr. Carlos Reyes', date: 'Mar 12, 2026', status: 'Active' },
                { label: 'Dr. Ana Villanueva', date: 'Apr 1, 2026', status: 'At risk' },
                { label: 'Dr. Luis Mendoza', date: 'Apr 15, 2026', status: 'Active' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm py-2 border-b border-gray-50 last:border-0">
                  <span className="text-gray-700">{item.label}</span>
                  <span className="text-xs text-gray-400">{item.date}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}
