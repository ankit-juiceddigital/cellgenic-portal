'use client'

import { useState } from 'react'
import { useMyReferralStats } from '@/hooks/useData'
import { Topbar } from '@/components/layout/Topbar'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { TableSkeleton, ErrorState } from '@/components/ui/Skeleton'
import { Copy, Mail, MessageCircle, QrCode, Check } from 'lucide-react'

export default function ReferralPage() {
  const { data, loading, error, refetch } = useMyReferralStats()
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (!data?.referral_url) return
    navigator.clipboard.writeText('https://' + data.referral_url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <Topbar title="My Referral Link" subtitle="Share your unique link to register new providers" />
      <div className="p-4 md:p-7">
        {loading && <TableSkeleton rows={3} />}
        {error && <ErrorState message={error} onRetry={refetch} />}
        {!loading && !error && data && (
          <div className="max-w-lg space-y-5">
            {/* Referral URL card */}
            <Card padding>
              <h2 className="text-sm font-semibold text-gray-900 mb-1">Your referral link</h2>
              <p className="text-sm text-gray-400 mb-4">
                When a provider registers via your link, they're automatically assigned to you. No code for them to type.
              </p>
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-100">
                <span className="text-xs font-mono text-gray-500 flex-1 truncate">{data.referral_url}</span>
                <Button size="sm" onClick={handleCopy}>
                  {copied ? <Check size={13} className="text-brand" /> : <Copy size={13} />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Your rep code: <span className="font-mono font-semibold text-gray-600">{data.rep_code}</span> · {data.total_registered} providers registered via this link
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
                {data.recent_registrations.length === 0 ? (
                  <p className="text-sm text-gray-400">No registrations yet via your link.</p>
                ) : data.recent_registrations.map((item: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm py-2 border-b border-gray-50 last:border-0">
                    <span className="text-gray-700">{item.name}</span>
                    <span className="text-xs text-gray-400">{item.date}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </>
  )
}
