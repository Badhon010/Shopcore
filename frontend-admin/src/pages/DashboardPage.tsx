import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  Bell,
  DollarSign,
  Package,
  ShoppingCart,
  Star,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { StatCard } from '@/components/ui/StatCard'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/feedback/EmptyState'
import { Skeleton } from '@/components/feedback/Skeleton'
import { ordersService } from '@/services/api/orders.service'
import { catalogService } from '@/services/api/catalog.service'
import { inventoryService } from '@/services/api/inventory.service'
import { reviewsService } from '@/services/api/reviews.service'
import { formatCurrency, formatDate, formatRelativeTime } from '@/utils/format'
import type { Order, Review } from '@/types/models'

type OrderStatusVariant = 'warning' | 'success' | 'info' | 'danger' | 'default'

function orderStatusBadge(status: string): { label: string; variant: OrderStatusVariant } {
  const map: Record<string, { label: string; variant: OrderStatusVariant }> = {
    PENDING_PAYMENT: { label: 'Pending', variant: 'warning' },
    PAID: { label: 'Paid', variant: 'info' },
    PROCESSING: { label: 'Processing', variant: 'info' },
    SHIPPED: { label: 'Shipped', variant: 'info' },
    DELIVERED: { label: 'Delivered', variant: 'success' },
    CANCELLED: { label: 'Cancelled', variant: 'danger' },
    REFUNDED: { label: 'Refunded', variant: 'danger' },
  }
  return map[status] ?? { label: status, variant: 'default' }
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5 text-warning">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < rating ? 'text-warning' : 'text-border'} aria-hidden>★</span>
      ))}
    </span>
  )
}

export function DashboardPage() {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const ordersQuery = useQuery({
    queryKey: ['admin-orders-count'],
    queryFn: () => ordersService.getOrders({ page_size: 10 }),
    staleTime: 30_000,
  })

  const productsQuery = useQuery({
    queryKey: ['admin-products-count'],
    queryFn: () => catalogService.getProducts({ page_size: 1 }),
    staleTime: 60_000,
  })

  const lowStockQuery = useQuery({
    queryKey: ['admin-low-stock-count'],
    queryFn: () => inventoryService.getStock({ is_low_stock: true, page_size: 1 }),
    staleTime: 30_000,
  })

  const pendingReviewsQuery = useQuery({
    queryKey: ['admin-pending-reviews'],
    queryFn: () => reviewsService.getReviews({ is_approved: false, page_size: 8 }),
    staleTime: 30_000,
  })

  const recentOrders = ordersQuery.data?.results ?? []
  const isOrdersLoading = ordersQuery.isLoading

  const totalRevenue = recentOrders.reduce((sum, o) => sum + parseFloat(o.grand_total || '0'), 0)

  const orderColumns: Column<Order>[] = [
    {
      key: 'order_number',
      header: 'Order',
      cell: (o) => (
        <Link
          to={`/orders/${o.order_number}`}
          className="font-mono text-body-sm font-semibold text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          #{o.order_number}
        </Link>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      cell: (o) => (
        <span className="text-body-sm text-text-secondary">{o.user_email ?? '—'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (o) => {
        const { label, variant } = orderStatusBadge(o.status)
        return <Badge variant={variant} dot>{label}</Badge>
      },
    },
    {
      key: 'total',
      header: 'Total',
      cell: (o) => (
        <span className="font-medium text-text-primary">{formatCurrency(o.grand_total)}</span>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      cell: (o) => (
        <span className="text-body-sm text-text-muted">{formatDate(o.created_at)}</span>
      ),
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-body-sm text-text-muted">{today}</p>
        <h1 className="mt-0.5 text-heading-lg font-bold text-text-primary">Dashboard</h1>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Orders"
          value={isOrdersLoading ? '…' : (ordersQuery.data?.count ?? 0).toLocaleString()}
          icon={ShoppingCart}
          variant="primary"
          description="all time"
          isLoading={isOrdersLoading}
        />
        <StatCard
          title="Revenue (visible)"
          value={isOrdersLoading ? '…' : formatCurrency(totalRevenue)}
          icon={DollarSign}
          variant="success"
          description="from recent orders"
          isLoading={isOrdersLoading}
        />
        <StatCard
          title="Products"
          value={productsQuery.isLoading ? '…' : (productsQuery.data?.count ?? 0).toLocaleString()}
          icon={Package}
          variant="default"
          description="in catalog"
          isLoading={productsQuery.isLoading}
        />
        <StatCard
          title="Low Stock"
          value={lowStockQuery.isLoading ? '…' : (lowStockQuery.data?.count ?? 0).toLocaleString()}
          icon={AlertTriangle}
          variant={lowStockQuery.data && lowStockQuery.data.count > 0 ? 'warning' : 'default'}
          description="items need restocking"
          isLoading={lowStockQuery.isLoading}
        />
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent orders */}
        <div className="lg:col-span-2">
          <Card noPadding>
            <CardHeader className="px-6 py-5">
              <CardTitle>Recent Orders</CardTitle>
              <Link
                to="/orders"
                className="text-body-sm font-medium text-primary hover:underline"
              >
                View all →
              </Link>
            </CardHeader>
            <DataTable
              columns={orderColumns}
              data={recentOrders}
              isLoading={isOrdersLoading}
              keyExtractor={(o) => o.id}
              emptyIcon={ShoppingCart}
              emptyTitle="No orders yet"
              emptyDescription="Orders placed by customers will appear here."
              className="border-t border-border"
            />
          </Card>
        </div>

        {/* Pending reviews */}
        <div className="lg:col-span-1">
          <Card noPadding className="h-fit">
            <CardHeader className="px-6 py-5">
              <CardTitle>Pending Reviews</CardTitle>
              <Link
                to="/reviews"
                className="text-body-sm font-medium text-primary hover:underline"
              >
                Manage →
              </Link>
            </CardHeader>
            <div className="divide-y divide-border">
              {pendingReviewsQuery.isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2 px-6 py-4">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))
              ) : pendingReviewsQuery.data?.results.length === 0 ? (
                <div className="px-6 pb-6">
                  <EmptyState
                    icon={Star}
                    title="All caught up"
                    description="No reviews are waiting for approval."
                    className="border-0 shadow-none py-10"
                  />
                </div>
              ) : (
                pendingReviewsQuery.data?.results.map((review: Review) => (
                  <div key={review.id} className="px-6 py-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-body-sm font-medium text-text-primary">
                          {review.title}
                        </p>
                        <p className="mt-0.5 truncate text-caption text-text-muted">
                          {review.user_email}
                        </p>
                      </div>
                      <RatingStars rating={review.rating} />
                    </div>
                    <p className="mt-1 line-clamp-2 text-caption text-text-secondary">
                      {review.body}
                    </p>
                    <p className="mt-1.5 text-caption text-text-muted">
                      {formatRelativeTime(review.created_at)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Manage Products', to: '/catalog/products', icon: Package },
          { label: 'View Inventory', to: '/catalog/inventory', icon: AlertTriangle },
          { label: 'Browse Customers', to: '/customers', icon: Bell },
          { label: 'Review Coupons', to: '/coupons', icon: Star },
        ].map(({ label, to, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-body-sm font-medium text-text-secondary shadow-xs transition-all hover:border-primary/30 hover:bg-primary-light hover:text-primary"
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            {label}
          </Link>
        ))}
      </div>
    </div>
  )
}
