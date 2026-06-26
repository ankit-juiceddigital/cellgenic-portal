'use client'
// File: src/app/leaderboard/page.tsx

import { useAuth } from '@/lib/auth-context'
import { useLeaderboard } from '@/hooks/useData'
import { Topbar } from '@/components/layout/Topbar'
import { Card } from '@/components/ui/Card'
import { TableSkeleton, ErrorState } from '@/components/ui/Skeleton'

export default function LeaderboardPage() {
  const { user } = useAuth()
  const { leaderboard, loading, error } = useLeaderboard()

  const myRank = leaderboard?.find((r: any) => r.rep_code === user?.repCode)
  const maxOrders = leaderboard?.[0]?.ordersMonth || 1

  return (
    <>
      <Topbar title="Monthly Leaderboard" subtitle="Top performing sales representatives this month" />
      <div className="p-7">
        <p className="text-sm text-gray-400 mb-6">Rankings based on total orders placed this month. Updated in real time.</p>

        {loading && <TableSkeleton rows={3} />}
        {error && <ErrorState message={error} />}

        {!loading && !error && leaderboard && (
          <div className="max-w-xl space-y-4">
            <Card>
              {leaderboard.map((rep: any) => (
                <div
                  key={rep.id}
                  className={`flex items-center gap-4 px-4 py-4 border-b border-gray-50 last:border-0 ${rep.rep_code === user?.repCode ? 'bg-green-50/50' : ''}`}
                >
                  <div className="text-2xl w-9 text-center flex-shrink-0">
                    {rep.rank === 1 ? '🥇' : rep.rank === 2 ? '🥈' : rep.rank === 3 ? '🥉' : `#${rep.rank}`}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">{rep.name}</p>
                      {rep.rep_code === user?.repCode && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">You</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{rep.clients} clients · {rep.ordersMonth} orders this month</p>
                    <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand rounded-full transition-all"
                        style={{ width: `${Math.round((rep.ordersMonth / maxOrders) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xl font-bold text-gray-900">#{rep.rank}</p>
                    <p className="text-xs text-gray-400">{rep.ordersMonth} orders</p>
                  </div>
                </div>
              ))}
            </Card>

            {myRank && myRank.rank > 1 && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                <span className="text-2xl">
                  {myRank.rank === 2 ? '🥈' : myRank.rank === 3 ? '🥉' : `#${myRank.rank}`}
                </span>
                <div>
                  <p className="text-sm font-semibold text-green-700">You're in {myRank.rank === 2 ? '2nd' : myRank.rank === 3 ? '3rd' : `${myRank.rank}th`} place!</p>
                  <p className="text-xs text-green-600 mt-0.5">
                    {leaderboard[0].ordersMonth - myRank.ordersMonth} orders behind {leaderboard[0].name}. Keep going!
                  </p>
                </div>
              </div>
            )}

            {myRank?.rank === 1 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
                <span className="text-2xl">🥇</span>
                <div>
                  <p className="text-sm font-semibold text-amber-700">You're in 1st place!</p>
                  <p className="text-xs text-amber-600 mt-0.5">Keep up the great work this month.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
