import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import {
  DollarSign, ShoppingCart, Users, AlertTriangle,
  Package, Star, UserPlus, Clock,
} from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell,
} from 'recharts'
import { Link } from 'react-router-dom'
import { dashboardService } from '@/services/api/dashboard.service'
import { StatCard } from '@/components/ui/StatCard'
import { Card, CardTitle, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton, StatCardSkeleton } from '@/components/feedback/Skeleton'
import { ErrorState } from '@/components/feedback/ErrorState'
import { formatCurrency, formatDate, formatNumber } from '@/utils/format'
import type { RecentCustomerItem, RecentOrderItem, RecentReviewItem } from '@/types/models'

const TOOLTIP_STYLE: React.CSSProperties = {
  background: 'hsl(var(--surface-elevated))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: 12,
}

const ORDER_STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  DELIVERED: 'success',
  SHIPPED: 'info',
  PROCESSING: 'info',
  CONFIRMED: 'info',
  PENDING: 'warning',
  CANCELLED: 'danger',
  REFUNDED: 'default',
}

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'hsl(var(--warning))',
  CONFIRMED: 'hsl(var(--info))',
  PROCESSING: 'hsl(var(--info))',
  SHIPPED: 'hsl(var(--primary))',
  DELIVERED: 'hsl(var(--success))',
  CANCELLED: 'hsl(var(--danger))',
  REFUNDED: 'hsl(var(--text-muted))',
}

function ChartEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-48 items-center justify-center text-sm text-text-muted">{children}</div>
  )
}

function RecentCustomerRow({ customer }: { customer: RecentCustomerItem }) {
  const initial = (customer.full_name || customer.email || '?').charAt(0).toUpperCase()
  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-light text-xs font-semibold text-primary">
          {initial}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-text-primary">{customer.full_name || '—'}</p>
          <p className="truncate text-xs text-text-muted">{customer.email}</p>
        </div>
      </div>
      <span className="shrink-0 text-xs text-text-muted">{formatDate(customer.date_joined)}</span>
    </div>
  )
}

function RecentReviewRow({ review }: { review: RecentReviewItem }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3.5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg-subtle">
          <Star className="h-4 w-4 text-warning" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-text-primary">{review.product_name || '—'}</p>
          <p className="truncate text-xs text-text-muted">
            {review.user_email ?? 'Anonymous'} · {formatDate(review.created_at)}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-xs font-semibold tabular-nums text-text-primary">{review.rating.toFixed(1)}</span>
        <Badge variant={review.is_approved ? 'success' : 'warning'}>{review.is_approved ? 'Approved' : 'Pending'}</Badge>
      </div>
    </div>
  )
}

export function DashboardPage() {
  const { isAuthenticated } = useAuth()

  const { data: overview, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard', 'overview', 30],
    queryFn: () => dashboardService.getOverview(),
    staleTime: 60_000,
    enabled: isAuthenticated,
  })

  const { data: revenueAnalytics, isLoading: revenueLoading, error: revenueError } = useQuery({
    queryKey: ['dashboard', 'revenue', 7],
    queryFn: () => dashboardService.getRevenueAnalytics({ days: 7 }),
    staleTime: 60_000,
    enabled: isAuthenticated,
  })

  if (error) {
    return <ErrorState description="Could not load dashboard data." onRetry={() => void refetch()} />
  }

  // Real backend chart data
  const revenueData = (revenueAnalytics?.over_time ?? []).map((p) => ({
    date: p.bucket,
    revenue: Number(p.revenue ?? 0),
  }))
  const ordersData = (overview?.orders_chart ?? []).map((p) => ({
    date: p.date,
    orders: Number(p.orders ?? 0),
  }))
  const statusData = Object.entries(overview?.orders.by_status ?? {}).map(([name, value]) => ({
    name,
    value,
  }))
  const statusTotal = statusData.reduce((sum, s) => sum + s.value, 0)

  const recentOrders: RecentOrderItem[] = overview?.recent_orders ?? []
  const recentCustomers: RecentCustomerItem[] = overview?.recent_customers ?? []
  const recentReviews: RecentReviewItem[] = overview?.recent_reviews ?? []

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-lg font-semibold text-text-primary">Dashboard</h1>
        <p className="text-sm text-text-muted">Overview of your store performance — live data from your backend</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              label="Total Revenue"
              value={overview ? formatCurrency(overview.total_revenue) : '—'}
              icon={<DollarSign />}
              trend={overview?.revenue_change_pct}
            />
            <StatCard
              label="Total Orders"
              value={overview ? formatNumber(overview.total_orders) : '—'}
              icon={<ShoppingCart />}
              trend={overview?.orders_change_pct}
            />
            <StatCard
              label="Customers"
              value={overview ? formatNumber(overview.total_customers) : '—'}
              icon={<Users />}
              trend={overview?.customers_change_pct}
            />
            <StatCard
              label="Low Stock SKUs"
              value={overview ? formatNumber(overview.low_stock_count) : '—'}
              icon={<AlertTriangle />}
            />
          </>
        )}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Revenue chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue (Last 7 Days)</CardTitle>
          </CardHeader>
          {revenueLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : revenueError ? (
            <ChartEmpty>Could not load revenue data.</ChartEmpty>
          ) : revenueData.length > 0 ? (
            <div role="img" aria-label="Revenue over the last 7 days">
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={revenueData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-light))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--text-muted))' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--text-muted))' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `$${v}`} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [formatCurrency(v), 'Revenue']} />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <ChartEmpty>No revenue data yet</ChartEmpty>
          )}
        </Card>

        {/* Top products */}
        <Card>
          <CardHeader>
            <CardTitle>Top Products</CardTitle>
          </CardHeader>
          {isLoading ? (
            <Skeleton rows={5} height="28px" />
          ) : (overview?.top_products ?? []).length > 0 ? (
            <div role="img" aria-label="Top products by revenue">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={overview!.top_products.slice(0, 5)} layout="vertical" margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--text-muted))' }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="product_name" tick={{ fontSize: 11, fill: 'hsl(var(--text-muted))' }} tickLine={false} axisLine={false} width={90} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [formatCurrency(v), 'Revenue']} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <ChartEmpty>No sales data yet</ChartEmpty>
          )}
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Orders chart */}
        <Card>
          <CardHeader>
            <CardTitle>Orders (Last 30 Days)</CardTitle>
          </CardHeader>
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : ordersData.length > 0 ? (
            <div role="img" aria-label="Orders over the last 30 days">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={ordersData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-light))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--text-muted))' }} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--text-muted))' }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [formatNumber(v), 'Orders']} />
                  <Bar dataKey="orders" fill="hsl(var(--info))" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <ChartEmpty>No orders yet</ChartEmpty>
          )}
        </Card>

        {/* Order status distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Order Status</CardTitle>
          </CardHeader>
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : statusData.length > 0 ? (
            <div className="flex h-48 items-center gap-4">
              <div className="relative h-40 w-40 shrink-0" role="img" aria-label="Order status distribution">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={70} paddingAngle={2} stroke="none">
                      {statusData.map((entry) => (
                        <Cell key={entry.name} fill={STATUS_COLOR[entry.name] ?? 'hsl(var(--text-muted))'} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number, name: string) => [formatNumber(v), name]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-bold text-text-primary tabular-nums">{formatNumber(statusTotal)}</span>
                  <span className="text-[10px] uppercase tracking-wider text-text-muted">orders</span>
                </div>
              </div>
              <ul className="min-w-0 flex-1 space-y-1.5">
                {statusData.map((s) => (
                  <li key={s.name} className="flex items-center gap-2 text-xs">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: STATUS_COLOR[s.name] ?? 'hsl(var(--text-muted))' }} />
                    <span className="flex-1 truncate text-text-secondary">{s.name}</span>
                    <span className="font-medium tabular-nums text-text-primary">{formatNumber(s.value)}</span>
                    <span className="w-11 text-right tabular-nums text-text-muted">
                      {statusTotal > 0 ? `${((s.value / statusTotal) * 100).toFixed(1)}%` : '—'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <ChartEmpty>No orders yet</ChartEmpty>
          )}
        </Card>
      </div>

      {/* Recent orders */}
      <Card padding="none">
        <div className="flex items-center justify-between border-b border-border p-5">
          <CardTitle>Recent Orders</CardTitle>
          <Link to="/orders" className="text-xs font-medium text-primary hover:underline">View all</Link>
        </div>
        {isLoading ? (
          <Skeleton rows={5} className="m-4" height="40px" />
        ) : recentOrders.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-text-muted">No orders yet</p>
        ) : (
          <div className="divide-y divide-border-light">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-bg-subtle">
                    <Package className="h-4 w-4 text-text-muted" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">#{order.order_number}</p>
                    <p className="text-xs text-text-muted">{order.user_email ?? '—'} · {formatDate(order.placed_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={ORDER_STATUS_VARIANT[order.status] ?? 'default'}>
                    {order.status}
                  </Badge>
                  <span className="text-sm font-medium text-text-primary">
                    {formatCurrency(order.grand_total)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Recent customers & reviews */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card padding="none">
          <div className="flex items-center justify-between border-b border-border p-5">
            <CardTitle>Recent Customers</CardTitle>
            <UserPlus className="h-4 w-4 text-text-muted" aria-hidden />
          </div>
          {isLoading ? (
            <Skeleton rows={5} className="m-4" height="40px" />
          ) : recentCustomers.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-text-muted">No customers yet</p>
          ) : (
            <div className="divide-y divide-border-light">
              {recentCustomers.map((customer) => (
                <RecentCustomerRow key={customer.id} customer={customer} />
              ))}
            </div>
          )}
        </Card>

        <Card padding="none">
          <div className="flex items-center justify-between border-b border-border p-5">
            <CardTitle>Recent Reviews</CardTitle>
            <Clock className="h-4 w-4 text-text-muted" aria-hidden />
          </div>
          {isLoading ? (
            <Skeleton rows={5} className="m-4" height="40px" />
          ) : recentReviews.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-text-muted">No reviews yet</p>
          ) : (
            <div className="divide-y divide-border-light">
              {recentReviews.map((review) => (
                <RecentReviewRow key={review.id} review={review} />
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
