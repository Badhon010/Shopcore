import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  DollarSign,
  Package,
  ShoppingCart,
  Star,
  Users,
  XCircle,
  Clock,
  Truck,
  RefreshCw,
  TrendingUp,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { StatCard } from '@/components/ui/StatCard'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/feedback/Skeleton'
import { ordersService } from '@/services/api/orders.service'
import { catalogService } from '@/services/api/catalog.service'
import { inventoryService } from '@/services/api/inventory.service'
import { reviewsService } from '@/services/api/reviews.service'
import { customersService } from '@/services/api/customers.service'
import { formatCurrency } from '@/utils/format'
import { cn } from '@/utils/cn'
import type { OrderStatus } from '@/types/models'

// ── Types ────────────────────────────────────────────────────

interface StatusStat {
  status: OrderStatus
  label: string
  count: number
  color: string
  icon: React.ComponentType<{ className?: string }>
}

// ── Helpers ──────────────────────────────────────────────────

function BarSegment({ pct, color }: { pct: number; color: string }) {
  return (
    <div
      className={cn('h-full rounded-sm transition-all duration-500', color)}
      style={{ width: `${Math.max(pct, pct > 0 ? 2 : 0)}%` }}
    />
  )
}

function StatusRow({
  label,
  count,
  total,
  color,
  icon: Icon,
  variant,
}: {
  label: string
  count: number
  total: number
  color: string
  icon: React.ComponentType<{ className?: string }>
  variant: 'warning' | 'success' | 'info' | 'danger' | 'default'
}) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="h-3.5 w-3.5 shrink-0 text-text-muted" aria-hidden />
          <span className="text-body-sm text-text-secondary truncate">{label}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={variant} className="tabular-nums">{count}</Badge>
          <span className="w-10 text-right text-caption text-text-muted tabular-nums">{pct.toFixed(0)}%</span>
        </div>
      </div>
      <div className="h-1.5 w-full rounded-full bg-bg-subtle overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-700', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function CatalogBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 shrink-0 text-caption text-text-muted">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-bg-subtle overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-700', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 text-right text-caption font-medium text-text-secondary tabular-nums">{count}</span>
    </div>
  )
}

function SectionSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-4 p-6">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3.5 w-12" />
          </div>
          <Skeleton className="h-1.5 w-full" />
        </div>
      ))}
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────

export function AnalyticsPage() {
  // Fetch all data in parallel
  const ordersQuery = useQuery({
    queryKey: ['analytics-orders'],
    queryFn: () => ordersService.getOrders({ page_size: 100 }),
    staleTime: 60_000,
  })

  const productsQuery = useQuery({
    queryKey: ['analytics-products-total'],
    queryFn: () => catalogService.getProducts({ page_size: 1 }),
    staleTime: 60_000,
  })

  const activeProductsQuery = useQuery({
    queryKey: ['analytics-products-active'],
    queryFn: () => catalogService.getProducts({ status: 'ACTIVE', page_size: 1 }),
    staleTime: 60_000,
  })

  const draftProductsQuery = useQuery({
    queryKey: ['analytics-products-draft'],
    queryFn: () => catalogService.getProducts({ status: 'DRAFT', page_size: 1 }),
    staleTime: 60_000,
  })

  const archivedProductsQuery = useQuery({
    queryKey: ['analytics-products-archived'],
    queryFn: () => catalogService.getProducts({ status: 'ARCHIVED', page_size: 1 }),
    staleTime: 60_000,
  })

  const lowStockQuery = useQuery({
    queryKey: ['analytics-low-stock'],
    queryFn: () => inventoryService.getStock({ is_low_stock: true, page_size: 1 }),
    staleTime: 60_000,
  })

  const reviewsQuery = useQuery({
    queryKey: ['analytics-reviews-total'],
    queryFn: () => reviewsService.getReviews({ page_size: 1 }),
    staleTime: 60_000,
  })

  const pendingReviewsQuery = useQuery({
    queryKey: ['analytics-reviews-pending'],
    queryFn: () => reviewsService.getReviews({ is_approved: false, page_size: 1 }),
    staleTime: 60_000,
  })

  const customersQuery = useQuery({
    queryKey: ['analytics-customers'],
    queryFn: () => customersService.getCustomers({ page_size: 1 }),
    staleTime: 60_000,
  })

  // Derived values
  const orders = ordersQuery.data?.results ?? []
  const totalOrders = ordersQuery.data?.count ?? 0
  const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.grand_total || '0'), 0)
  const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0

  // Order status breakdown from fetched results
  const statusCounts: Partial<Record<OrderStatus, number>> = {}
  for (const order of orders) {
    statusCounts[order.status] = (statusCounts[order.status] ?? 0) + 1
  }

  const orderStatusStats: StatusStat[] = [
    { status: 'DELIVERED',       label: 'Delivered',       count: statusCounts['DELIVERED']       ?? 0, color: 'bg-success',   icon: CheckCircle2 },
    { status: 'PROCESSING',      label: 'Processing',      count: statusCounts['PROCESSING']      ?? 0, color: 'bg-info',      icon: RefreshCw    },
    { status: 'SHIPPED',         label: 'Shipped',         count: statusCounts['SHIPPED']         ?? 0, color: 'bg-primary',   icon: Truck        },
    { status: 'PAID',            label: 'Paid',            count: statusCounts['PAID']            ?? 0, color: 'bg-primary',   icon: DollarSign   },
    { status: 'PENDING_PAYMENT', label: 'Pending payment', count: statusCounts['PENDING_PAYMENT'] ?? 0, color: 'bg-warning',   icon: Clock        },
    { status: 'CANCELLED',       label: 'Cancelled',       count: statusCounts['CANCELLED']       ?? 0, color: 'bg-danger',    icon: XCircle      },
    { status: 'REFUNDED',        label: 'Refunded',        count: statusCounts['REFUNDED']        ?? 0, color: 'bg-danger',    icon: RefreshCw    },
  ]

  const statusVariantMap: Record<OrderStatus, 'warning' | 'success' | 'info' | 'danger' | 'default'> = {
    DELIVERED:       'success',
    PROCESSING:      'info',
    SHIPPED:         'info',
    PAID:            'info',
    PENDING_PAYMENT: 'warning',
    CANCELLED:       'danger',
    REFUNDED:        'danger',
  }

  // Catalog counts
  const totalProducts    = productsQuery.data?.count        ?? 0
  const activeProducts   = activeProductsQuery.data?.count  ?? 0
  const draftProducts    = draftProductsQuery.data?.count   ?? 0
  const archivedProducts = archivedProductsQuery.data?.count ?? 0

  const catalogLoading =
    productsQuery.isLoading ||
    activeProductsQuery.isLoading ||
    draftProductsQuery.isLoading ||
    archivedProductsQuery.isLoading

  const totalReviews   = reviewsQuery.data?.count        ?? 0
  const pendingReviews = pendingReviewsQuery.data?.count  ?? 0
  const approvedReviews = totalReviews - pendingReviews
  const reviewsLoading = reviewsQuery.isLoading || pendingReviewsQuery.isLoading

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-heading-lg font-bold text-text-primary">Analytics</h1>
          <p className="mt-0.5 text-body-sm text-text-secondary">
            Store performance overview — live data from your ShopCore backend
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-caption text-text-muted">
          <TrendingUp className="h-3.5 w-3.5" aria-hidden />
          Live data
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Orders"
          value={ordersQuery.isLoading ? '…' : totalOrders.toLocaleString()}
          icon={ShoppingCart}
          variant="primary"
          description="all time"
          isLoading={ordersQuery.isLoading}
        />
        <StatCard
          title="Revenue (sampled)"
          value={ordersQuery.isLoading ? '…' : formatCurrency(totalRevenue)}
          icon={DollarSign}
          variant="success"
          description={`from ${orders.length} most recent orders`}
          isLoading={ordersQuery.isLoading}
        />
        <StatCard
          title="Customers"
          value={customersQuery.isLoading ? '…' : (customersQuery.data?.count ?? 0).toLocaleString()}
          icon={Users}
          variant="default"
          description="registered accounts"
          isLoading={customersQuery.isLoading}
        />
        <StatCard
          title="Low Stock"
          value={lowStockQuery.isLoading ? '…' : (lowStockQuery.data?.count ?? 0).toLocaleString()}
          icon={AlertTriangle}
          variant={lowStockQuery.data && lowStockQuery.data.count > 0 ? 'warning' : 'default'}
          description="variants need restocking"
          isLoading={lowStockQuery.isLoading}
        />
      </div>

      {/* Second row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Products"
          value={productsQuery.isLoading ? '…' : totalProducts.toLocaleString()}
          icon={Package}
          variant="default"
          description={`${activeProducts} active`}
          isLoading={productsQuery.isLoading}
        />
        <StatCard
          title="Avg Order Value"
          value={ordersQuery.isLoading ? '…' : formatCurrency(avgOrderValue)}
          icon={BarChart3}
          variant="default"
          description="from sampled orders"
          isLoading={ordersQuery.isLoading}
        />
        <StatCard
          title="Total Reviews"
          value={reviewsQuery.isLoading ? '…' : totalReviews.toLocaleString()}
          icon={Star}
          variant="default"
          description={`${approvedReviews} approved`}
          isLoading={reviewsQuery.isLoading}
        />
        <StatCard
          title="Pending Reviews"
          value={pendingReviewsQuery.isLoading ? '…' : pendingReviews.toLocaleString()}
          icon={Star}
          variant={pendingReviews > 0 ? 'warning' : 'default'}
          description="awaiting moderation"
          isLoading={pendingReviewsQuery.isLoading}
        />
      </div>

      {/* Detail panels */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Order status breakdown */}
        <Card noPadding>
          <CardHeader className="px-6 py-5">
            <CardTitle>Order Status Breakdown</CardTitle>
            <Link to="/orders" className="text-body-sm font-medium text-primary hover:underline">
              View all →
            </Link>
          </CardHeader>
          {ordersQuery.isLoading ? (
            <SectionSkeleton rows={5} />
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <ShoppingCart className="h-8 w-8 text-text-muted" aria-hidden />
              <p className="text-body-sm text-text-muted">No orders yet</p>
            </div>
          ) : (
            <div className="space-y-4 px-6 pb-6">
              {/* Stacked bar */}
              <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full">
                {orderStatusStats.map((s) => (
                  <BarSegment
                    key={s.status}
                    pct={totalOrders > 0 ? (s.count / Math.min(orders.length, totalOrders)) * 100 : 0}
                    color={s.color}
                  />
                ))}
              </div>
              {/* Rows */}
              <div className="space-y-3">
                {orderStatusStats.map((s) => (
                  <StatusRow
                    key={s.status}
                    label={s.label}
                    count={s.count}
                    total={orders.length}
                    color={s.color}
                    icon={s.icon}
                    variant={statusVariantMap[s.status]}
                  />
                ))}
              </div>
              <p className="pt-1 text-caption text-text-muted">
                Breakdown based on {orders.length} most recently fetched orders.
              </p>
            </div>
          )}
        </Card>

        {/* Right column: catalog health + reviews */}
        <div className="space-y-6">

          {/* Catalog health */}
          <Card noPadding>
            <CardHeader className="px-6 py-5">
              <CardTitle>Catalog Health</CardTitle>
              <Link to="/catalog/products" className="text-body-sm font-medium text-primary hover:underline">
                Manage →
              </Link>
            </CardHeader>
            {catalogLoading ? (
              <SectionSkeleton rows={3} />
            ) : (
              <div className="space-y-3 px-6 pb-6">
                <CatalogBar
                  label="Active"
                  count={activeProducts}
                  total={totalProducts}
                  color="bg-success"
                />
                <CatalogBar
                  label="Draft"
                  count={draftProducts}
                  total={totalProducts}
                  color="bg-warning"
                />
                <CatalogBar
                  label="Archived"
                  count={archivedProducts}
                  total={totalProducts}
                  color="bg-border"
                />
                <p className="pt-1 text-caption text-text-muted">
                  {totalProducts} total products across all statuses.
                </p>
              </div>
            )}
          </Card>

          {/* Review moderation */}
          <Card noPadding>
            <CardHeader className="px-6 py-5">
              <CardTitle>Review Moderation</CardTitle>
              <Link to="/reviews" className="text-body-sm font-medium text-primary hover:underline">
                Moderate →
              </Link>
            </CardHeader>
            {reviewsLoading ? (
              <SectionSkeleton rows={2} />
            ) : (
              <div className="space-y-3 px-6 pb-6">
                <div className="flex items-center justify-between rounded-lg bg-bg-subtle px-4 py-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />
                    <span className="text-body-sm text-text-secondary">Approved</span>
                  </div>
                  <span className="font-semibold tabular-nums text-text-primary">{approvedReviews}</span>
                </div>
                <div className={cn(
                  'flex items-center justify-between rounded-lg px-4 py-3',
                  pendingReviews > 0 ? 'bg-warning-subtle' : 'bg-bg-subtle'
                )}>
                  <div className="flex items-center gap-2">
                    <Clock className={cn('h-4 w-4', pendingReviews > 0 ? 'text-warning' : 'text-text-muted')} aria-hidden />
                    <span className="text-body-sm text-text-secondary">Pending</span>
                  </div>
                  <span className={cn('font-semibold tabular-nums', pendingReviews > 0 ? 'text-warning' : 'text-text-primary')}>
                    {pendingReviews}
                  </span>
                </div>
                {pendingReviews > 0 && (
                  <Link
                    to="/reviews"
                    className="block w-full rounded-lg border border-warning/30 bg-warning-subtle px-4 py-2.5 text-center text-body-sm font-medium text-warning transition-colors hover:bg-warning/20"
                  >
                    Review {pendingReviews} pending {pendingReviews === 1 ? 'submission' : 'submissions'} →
                  </Link>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
