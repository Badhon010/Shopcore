import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { ShoppingBag } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { OrderCard } from '@/features/orders/components/OrderCard'
import { Pagination } from '@/components/ui/Pagination'
import { Spinner } from '@/components/feedback/Spinner'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { useOrders } from '@/features/orders/hooks/useOrders'
import { APP_CONFIG } from '@/constants/config'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'

export function OrdersPage() {
  const [page, setPage] = useState(1)
  const navigate = useNavigate()
  const { data, isLoading, error, refetch } = useOrders({ page, page_size: APP_CONFIG.pagination.ordersPageSize })

  const totalPages = Math.ceil((data?.count ?? 0) / APP_CONFIG.pagination.ordersPageSize)

  return (
    <>
      <Helmet>
        <title>My Orders — ShopCore</title>
      </Helmet>
      <div>
        <h1 className="text-heading-lg font-semibold text-text-primary mb-6">My Orders</h1>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : error ? (
          <ErrorState onRetry={refetch} />
        ) : !data?.results.length ? (
          <EmptyState
            icon={<ShoppingBag className="h-8 w-8" />}
            title="No orders yet"
            description="When you place an order, it will appear here."
            action={{ label: 'Start shopping', onClick: () => navigate(ROUTES.PRODUCTS) }}
          />
        ) : (
          <>
            <div className="space-y-3">
              {data.results.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
            {totalPages > 1 && (
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} className="mt-6" />
            )}
          </>
        )}
      </div>
    </>
  )
}
