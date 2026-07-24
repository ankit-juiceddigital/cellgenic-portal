'use client'
// File: src/app/order/page.tsx

import { useAuth } from '@/lib/auth-context'
import { useClients, useProducts } from '@/hooks/useData'
import { Topbar } from '@/components/layout/Topbar'
import { Card } from '@/components/ui/Card'
import { MultiProductOrderForm } from '@/components/MultiProductOrder'

export default function OrderPage() {
  const { isAdmin, isManager } = useAuth()
  const { data: clients } = useClients()
  const { data: products, loading: productsLoading } = useProducts()

  const repAttribution = isAdmin ? 'Administrator' : isManager ? 'Sales Manager' : undefined

  return (
    <>
      <Topbar
        title="Place an Order"
        subtitle={
          repAttribution
            ? `Submit an order on behalf of one of your clients — placing as ${repAttribution}`
            : 'Submit an order on behalf of one of your clients'
        }
      />
      <div className="p-4 md:p-7">
        <Card padding className="max-w-lg">
          <MultiProductOrderForm
            clients={clients}
            products={products || []}
            productsLoading={productsLoading}
          />
        </Card>
      </div>
    </>
  )
}
