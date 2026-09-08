'use client'
// File: src/app/approvals/page.tsx
//
// Access requests awaiting review. A plain rep sees only providers who
// signed up under their own referral code — that scoping is enforced in
// cellgenic_get_pending_providers(), not here.

import { useAuth } from '@/lib/auth-context'
import { useUI } from '@/lib/ui-context'
import { usePortal } from '@/hooks/usePortal'
import { fmt, initials } from '@/lib/portal-model'
import { ChevronRight } from '@/components/ui/Icons'

export default function ApprovalsPage() {
  const { approvals, reps, loading, error, refetch } = usePortal()
  const { openDrawer } = useUI()
  const { user } = useAuth()
  const isRep = user?.role === 'sales_rep'

  if (error) {
    return (
      <div className="panel">
        <div className="empty">
          <b>Could not load requests</b>{error}
          <div style={{ marginTop: 14 }}>
            <button className="btn btn-sm" onClick={() => refetch()}>Try again</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="panel">
        <div className="panel-h">
          <h3>Pending requests</h3>
          <span className="c">{approvals.length}</span>
        </div>

        {loading ? (
          <div className="empty">Loading requests…</div>
        ) : approvals.length ? approvals.map(a => {
          const referrer = a.referralCode
            ? reps.find(r => r.repCode && r.repCode.toLowerCase() === a.referralCode!.toLowerCase())
            : null
          return (
            <button key={a.id} className="li" onClick={() => openDrawer({ kind: 'a', id: a.id })}>
              <span className="ini">{initials(a.n)}</span>
              <span className="grow">
                <span className="t">
                  {a.n}
                  {!a.hasDocument && (
                    <span className="tag" style={{ background: 'var(--amber-bg)', color: 'var(--amber)' }}>
                      No document
                    </span>
                  )}
                </span>
                <span className="s">
                  {a.c}<br />
                  Requested {fmt(a.req)} · {a.note}
                  {' · '}
                  {a.referralCode
                    ? `Referred by ${referrer ? referrer.name : a.referralCode}`
                    : 'No referral (unclaimed)'}
                </span>
              </span>
              <ChevronRight />
            </button>
          )
        }) : (
          <div className="empty">
            <b>Empty inbox</b>
            {isRep
              ? 'No requests from your referral link are waiting.'
              : 'No requests awaiting review.'}
          </div>
        )}
      </div>

      <p className="sub" style={{ marginTop: 12 }}>
        Granting access puts the account into Activation with the 30-day window starting today.
        {' '}Requests with no referral code are assigned to the next rep in round-robin order on approval.
      </p>
    </>
  )
}
