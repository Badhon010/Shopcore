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
  WifiOff,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { StatCard } from '@/components/ui/StatCard'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/feedback/Skeleton'
import { ErrorState } from '@/components/feedback/ErrorState'
import { ordersService } from '@/services/api/orders.service'
import { catalogService } from '@/services/api/catalog.service'
import { inventoryService } from '@/services/api/inventory.service'
import { reviewsService } from '@/services/api/reviews.service'
import { customersService } from '@/services/api/customers.service'
import { formatCurrency } from '@/utils/format'
import { cn } from '@/utils/cn'

// ── Helpers ──────────────────────────────────────────────────

function CatalogBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-xs text-text-muted">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-bg-subtle overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-700', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 text-right text-xs font-medium text-text-secondary tabular-nums">{count}</span>
    </div>
  )
}

function StatRow({ label, value, color, icon: Icon }: {
  label: string
  value: string | number
  color: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-bg-subtle px-4 py-3">
      <div className="flex items-center gap-2">
        <Icon className={cn('h-4 w-4', color)} aria-hidden />
        <span className="text-sm text-text-secondary">{label}</span>
      </div>
      <span className="font-semibold tabular-nums text-text-primary">{value}</span>
    </div>
  )
}

function SectionSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-6">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full rounded-lg" />
      ))}
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────

export function AnalyticsPage() {
  const statsQuery = useQuery({
    queryKey: ['analytics-order-stats'],
    queryFn: () => ordersService.getOrderStats(),
    staleTime: 60_000,
  })

  const productsQuery = useQuery({
    queryKey: ['analytics-products-total'],
    queryFn: () => catalogService.listProducts({ page_size: 1 }),
    staleTime: 60_000,
  })

  const publishedProductsQuery = useQuery({
    queryKey: ['analytics-products-published'],
    queryFn: () => catalogService.listProducts({ status: 'PUBLISHED', page_size: 1 }),
    staleTime: 60_000,
  })

  const draftProductsQuery = useQuery({
    queryKey: ['analytics-products-draft'],
    queryFn: () => catalogService.listProducts({ status: 'DRAFT', page_size: 1 }),
    staleTime: 60_000,
  })

  const archivedProductsQuery = useQuery({
    queryKey: ['analytics-products-archived'],
    queryFn: () => catalogService.listProducts({ status: 'ARCHIVED', page_size: 1 }),
    staleTime: 60_000,
  })

  const lowStockQuery = useQuery({
    queryKey: ['analytics-low-stock'],
    queryFn: () => inventoryService.listStock({ low_stock_only: true, page_size: 1 }),
    staleTime: 60_000,
  })

  const reviewsQuery = useQuery({
    queryKey: ['analytics-reviews-total'],
    queryFn: () => reviewsService.listReviews({ page_size: 1 }),
    staleTime: 60_000,
  })

  const pendingReviewsQuery = useQuery({
    queryKey: ['analytics-reviews-pending'],
    queryFn: () => reviewsService.listReviews({ is_approved: false, page_size: 1 }),
    staleTime: 60_000,
  })

  const customersQuery = useQuery({
    queryKey: ['analytics-customers'],
    queryFn: () => customersService.listCustomers({ page_size: 1 }),
    staleTime: 60_000,
  })

  const stats = statsQuery.data
  const totalOrders   = stats?.total_orders  ?? 0
  const pendingOrders = stats?.pending_orders ?? 0

  const totalProducts    = productsQuery.data?.count        ?? 0
  const publishedProducts = publishedProductsQuery.data?.count ?? 0
  const draftProducts    = draftProductsQuery.data?.count   ?? 0
  const archivedProducts = archivedProductsQuery.data?.count ?? 0

  const catalogLoading =
    productsQuery.isLoading ||
    publishedProductsQuery.isLoading ||
    draftProductsQuery.isLoading ||
    archivedProductsQuery.isLoading

  const totalReviews   = reviewsQuery.data?.count        ?? 0
  const pendingReviews = pendingReviewsQuery.data?.count  ?? 0
  const approvedReviews = totalReviews - pendingReviews
  const reviewsLoading = reviewsQuery.isLoading || pendingReviewsQuery.isLoading

  const backendDown =
    statsQuery.isError ||
    productsQuery.isError ||
    customersQuery.isError

  if (statsQuery.isError && productsQuery.isError && customersQuery.isError) {
    return (
      <ErrorState
        title="Backend unavailable"
        description="Could not connect to the ShopCore API. Make sure the Django backend is running on port 8000."
        onRetry={() => {
          void statsQuery.refetch()
          void productsQuery.refetch()
          void customersQuery.refetch()
        }}
      />
    )
  }

  return (
    <div className="space-y-8">
      {/* Backend warning banner */}
      {backendDown && (
        <div className="flex items-center gap-3 rounded-xl border border-warning/30 bg-warning-subtle px-4 py-3 text-sm text-warning">
          <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
          <span>Some data could not be loaded — the backend may be offline or your session may have expired. Numbers shown are from cached data.</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-text-primary">Analytics</h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            Store performance overview — live data from your ShopCore backend
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-text-muted">
          <TrendingUp className="h-3.5 w-3.5" aria-hidden />
          Live data
        </div>
      </div>

      {/* KPI grid — row 1 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Orders"
          value={statsQuery.isLoading ? '…' : totalOrders.toLocaleString()}
          icon={<ShoppingCart />}
        />
        <StatCard
          label="Revenue Today"
          value={statsQuery.isLoading ? '…' : formatCurrency(stats?.revenue_today ?? 0)}
          icon={<DollarSign />}
        />
        <StatCard
          label="Revenue This Month"
          value={statsQuery.isLoading ? '…' : formatCurrency(stats?.revenue_this_month ?? 0)}
          icon={<BarChart3 />}
        />
        <StatCard
          label="Pending Orders"
          value={statsQuery.isLoading ? '…' : pendingOrders.toLocaleString()}
          icon={<Clock />}
        />
      </div>

      {/* KPI grid — row 2 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Products"
          value={productsQuery.isLoading ? '…' : totalProducts.toLocaleString()}
          icon={<Package />}
          suffix={publishedProducts > 0 ? `${publishedProducts} published` : undefined}
        />
        <StatCard
          label="Customers"
          value={customersQuery.isLoading ? '…' : (customersQuery.data?.count ?? 0).toLocaleString()}
          icon={<Users />}
        />
        <StatCard
          label="Total Reviews"
          value={reviewsQuery.isLoading ? '…' : totalReviews.toLocaleString()}
          icon={<Star />}
          suffix={approvedReviews > 0 ? `${approvedReviews} approved` : undefined}
        />
        <StatCard
          label="Low Stock"
          value={lowStockQuery.isLoading ? '…' : (lowStockQuery.data?.count ?? 0).toLocaleString()}
          icon={<AlertTriangle />}
        />
      </div>

      {/* Detail panels */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Order highlights */}
        <Card padding="none">
          <CardHeader className="px-6 py-5">
            <CardTitle>Order Highlights</CardTitle>
            <Link to="/orders" className="text-sm font-medium text-primary hover:underline">
              View all →
            </Link>
          </CardHeader>
          {statsQuery.isLoading ? (
            <SectionSkeleton rows={4} />
          ) : (
            <div className="space-y-2 px-6 pb-6">
              <StatRow
                label="Total orders"
                value={totalOrders.toLocaleString()}
                color="text-primary"
                icon={ShoppingCart}
              />
              <StatRow
                label="Orders today"
                value={(stats?.orders_today ?? 0).toLocaleString()}
                color="text-info"
                icon={TrendingUp}
              />
              {stats?.orders_this_week != null && (
                <StatRow
                  label="Orders this week"
                  value={stats.orders_this_week.toLocaleString()}
                  color="text-info"
                  icon={Truck}
                />
              )}
              <StatRow
                label="Pending orders"
                value={pendingOrders.toLocaleString()}
                color={pendingOrders > 0 ? 'text-warning' : 'text-text-muted'}
                icon={Clock}
              />
              <StatRow
                label="Revenue today"
                value={formatCurrency(stats?.revenue_today ?? 0)}
                color="text-success"
                icon={DollarSign}
              />
              <StatRow
                label="Revenue this month"
                value={formatCurrency(stats?.revenue_this_month ?? 0)}
                color="text-success"
                icon={RefreshCw}
              />
            </div>
          )}
        </Card>

        {/* Right column */}
        <div className="space-y-6">

          {/* Catalog health */}
          <Card padding="none">
            <CardHeader className="px-6 py-5">
              <CardTitle>Catalog Health</CardTitle>
              <Link to="/catalog/products" className="text-sm font-medium text-primary hover:underline">
                Manage →
              </Link>
            </CardHeader>
            {catalogLoading ? (
              <SectionSkeleton rows={3} />
            ) : (
              <div className="space-y-3 px-6 pb-6">
                <CatalogBar
                  label="Published"
                  count={publishedProducts}
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
                <p className="pt-1 text-xs text-text-muted">
                  {totalProducts} total products across all statuses.
                </p>
              </div>
            )}
          </Card>

          {/* Review moderation */}
          <Card padding="none">
            <CardHeader className="px-6 py-5">
              <CardTitle>Review Moderation</CardTitle>
              <Link to="/reviews" className="text-sm font-medium text-primary hover:underline">
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
                    <span className="text-sm text-text-secondary">Approved</span>
                  </div>
                  <span className="font-semibold tabular-nums text-text-primary">
                    {approvedReviews}
                  </span>
                </div>
                <div className={cn(
                  'flex items-center justify-between rounded-lg px-4 py-3',
                  pendingReviews > 0 ? 'bg-warning-subtle' : 'bg-bg-subtle'
                )}>
                  <div className="flex items-center gap-2">
                    <Clock
                      className={cn('h-4 w-4', pendingReviews > 0 ? 'text-warning' : 'text-text-muted')}
                      aria-hidden
                    />
                    <span className="text-sm text-text-secondary">Pending</span>
                  </div>
                  <Badge variant={pendingReviews > 0 ? 'warning' : 'default'}>
                    {pendingReviews}
                  </Badge>
                </div>
                {pendingReviews > 0 && (
                  <Link
                    to="/reviews"
                    className="block w-full rounded-lg border border-warning/30 bg-warning-subtle px-4 py-2.5 text-center text-sm font-medium text-warning transition-colors hover:bg-warning/20"
                  >
                    Review {pendingReviews} pending {pendingReviews === 1 ? 'submission' : 'submissions'} →
                  </Link>
                )}

                <div className="flex items-center justify-between rounded-lg bg-bg-subtle px-4 py-3">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-text-muted" aria-hidden />
                    <span className="text-sm text-text-secondary">Low stock SKUs</span>
                  </div>
                  <Badge variant={lowStockQuery.data && lowStockQuery.data.count > 0 ? 'danger' : 'default'}>
                    {lowStockQuery.isLoading ? '…' : (lowStockQuery.data?.count ?? 0)}
                  </Badge>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
