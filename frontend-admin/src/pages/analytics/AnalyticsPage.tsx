import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  CheckCircle2,
  DollarSign,
  Package,
  ShoppingCart,
  Star,
  Users,
  Clock,
  WifiOff,
  TrendingUp,
  Tag,
  Warehouse,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { StatCard } from '@/components/ui/StatCard'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/feedback/Skeleton'
import { ErrorState } from '@/components/feedback/ErrorState'
import { dashboardService } from '@/services/api/dashboard.service'
import { formatCurrency, formatNumber } from '@/utils/format'
import { cn } from '@/utils/cn'
import type { AnalyticsGranularity } from '@/types/models'

const TOOLTIP_STYLE: React.CSSProperties = {
  background: 'hsl(var(--surface-elevated))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: 12,
}

const PIE_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--info))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--danger))',
  'hsl(var(--text-muted))',
]

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'hsl(var(--warning))',
  CONFIRMED: 'hsl(var(--info))',
  PROCESSING: 'hsl(var(--info))',
  SHIPPED: 'hsl(var(--primary))',
  DELIVERED: 'hsl(var(--success))',
  CANCELLED: 'hsl(var(--danger))',
  REFUNDED: 'hsl(var(--text-muted))',
}

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

function ChartEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-52 items-center justify-center px-6 text-sm text-text-muted">{children}</div>
  )
}

function ChartError({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex h-52 flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-sm text-text-muted">Could not load this chart.</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-bg-subtle"
        >
          Retry
        </button>
      )}
    </div>
  )
}

const ANALYTICS_DAYS: Record<AnalyticsGranularity, number> = {
  day: 90,
  week: 365,
  month: 730,
  year: 730,
}

/** Format a raw 'YYYY-MM-DD' picker value without timezone shifting. */
function formatDateRangeLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function GranularityPicker({ value, onChange }: { value: AnalyticsGranularity; onChange: (g: AnalyticsGranularity) => void }) {
  const options: Array<{ value: AnalyticsGranularity; label: string }> = [
    { value: 'day', label: 'Daily' },
    { value: 'week', label: 'Weekly' },
    { value: 'month', label: 'Monthly' },
    { value: 'year', label: 'Yearly' },
  ]
  return (
    <div className="flex w-fit gap-0.5 rounded-xl border border-border bg-background p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
            value === o.value ? 'bg-surface text-text-primary shadow-xs' : 'text-text-muted hover:text-text-primary'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────

export function AnalyticsPage() {
  const { isAuthenticated } = useAuth()
  const [granularity, setGranularity] = useState<AnalyticsGranularity>('day')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const analyticsDays = ANALYTICS_DAYS[granularity]

  // A full date range (both ends set) overrides the look-back window and lets
  // admins inspect any arbitrary period. Keys must include the range so the
  // caches invalidate when it changes.
  const rangeActive = Boolean(dateFrom && dateTo)
  const windowKey = rangeActive ? `range:${dateFrom}:${dateTo}` : `days:${analyticsDays}`
  const rangeParams = rangeActive
    ? { date_from: dateFrom, date_to: dateTo }
    : { days: analyticsDays }
  const windowLabel = rangeActive
    ? `${formatDateRangeLabel(dateFrom)} – ${formatDateRangeLabel(dateTo)}`
    : `last ${analyticsDays} days`

  // Same key as the Dashboard page so the identical overview payload is cached once.
  const overviewQuery = useQuery({
    queryKey: ['dashboard', 'overview', 30],
    queryFn: () => dashboardService.getOverview(),
    staleTime: 60_000,
    enabled: isAuthenticated,
  })

  const revenueQuery = useQuery({
    queryKey: ['analytics', 'revenue', windowKey, granularity],
    queryFn: () => dashboardService.getRevenueAnalytics({ ...rangeParams, granularity }),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
    enabled: isAuthenticated,
  })

  const ordersQuery = useQuery({
    queryKey: ['analytics', 'orders', windowKey, granularity],
    queryFn: () => dashboardService.getOrderAnalytics({ ...rangeParams, granularity }),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
    enabled: isAuthenticated,
  })

  const bestSellersQuery = useQuery({
    queryKey: ['analytics', 'best-sellers', windowKey],
    queryFn: () => dashboardService.getBestSellers({ ...rangeParams, limit: 10 }),
    staleTime: 60_000,
    enabled: isAuthenticated,
  })

  const customersQuery = useQuery({
    queryKey: ['analytics', 'customers', windowKey, granularity],
    queryFn: () => dashboardService.getCustomerGrowth({ ...rangeParams, granularity }),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
    enabled: isAuthenticated,
  })

  const inventoryQuery = useQuery({
    queryKey: ['analytics', 'inventory'],
    queryFn: () => dashboardService.getInventoryAnalytics(),
    staleTime: 60_000,
    enabled: isAuthenticated,
  })

  const newsletterQuery = useQuery({
    queryKey: ['analytics', 'newsletter', windowKey, granularity],
    queryFn: () => dashboardService.getNewsletterAnalytics({ ...rangeParams, granularity }),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
    enabled: isAuthenticated,
  })

  const couponsQuery = useQuery({
    queryKey: ['analytics', 'coupons', windowKey],
    queryFn: () => dashboardService.getCouponAnalytics(rangeParams),
    staleTime: 60_000,
    enabled: isAuthenticated,
  })

  const overview = overviewQuery.data

  const totalOrders    = overview?.total_orders   ?? 0
  const pendingOrders  = overview?.pending_orders  ?? 0
  const totalRevenue   = overview?.total_revenue   ?? 0
  const totalCustomers = overview?.total_customers ?? 0
  const lowStockCount  = overview?.low_stock_count  ?? 0

  const productsByStatus = overview?.products.by_status ?? {}
  const totalProducts     = overview?.products.total ?? 0
  const publishedProducts = productsByStatus['PUBLISHED'] ?? 0
  const draftProducts     = productsByStatus['DRAFT'] ?? 0
  const archivedProducts  = productsByStatus['ARCHIVED'] ?? 0

  const totalReviews    = overview?.reviews.total    ?? 0
  const approvedReviews = overview?.reviews.approved ?? 0
  const pendingReviews  = overview?.reviews.pending  ?? 0
  const avgRating       = overview?.reviews.average_rating ?? 0

  // Chart data derived from backend aggregates (presentation mapping only)
  const revenueOverTime = (revenueQuery.data?.over_time ?? []).map((p) => ({
    bucket: p.bucket,
    revenue: Number(p.revenue ?? 0),
    orders: Number(p.orders ?? 0),
  }))
  const customerOverTime = (customersQuery.data?.over_time ?? []).map((p) => ({
    bucket: p.bucket,
    new_customers: Number(p.new_customers ?? 0),
  }))
  const newsletterOverTime = (newsletterQuery.data?.growth_over_time ?? []).map((p) => ({
    bucket: p.bucket,
    new_subscribers: Number(p.new_subscribers ?? 0),
  }))
  const statusData = (ordersQuery.data?.status_distribution ?? []).map((s) => ({
    name: s.status,
    value: s.count,
  }))

  const inventory = inventoryQuery.data?.summary
  const warehouses = inventoryQuery.data?.by_warehouse ?? []
  const invDonut = [
    { name: 'In stock', value: inventory?.in_stock_count ?? 0 },
    { name: 'Low stock', value: inventory?.low_stock_count ?? 0 },
    { name: 'Out of stock', value: inventory?.out_of_stock_count ?? 0 },
  ]
  const INV_COLORS = ['hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--danger))']
  const statusTotal = statusData.reduce((a, d) => a + d.value, 0)

  const hasError =
    overviewQuery.isError ||
    revenueQuery.isError ||
    ordersQuery.isError ||
    bestSellersQuery.isError ||
    customersQuery.isError ||
    inventoryQuery.isError ||
    newsletterQuery.isError ||
    couponsQuery.isError

  if (overviewQuery.isError) {
    return (
      <ErrorState
        title="Backend unavailable"
        description="Could not connect to the ShopCore API. Make sure the Django backend is running on port 8000."
        onRetry={() => { void overviewQuery.refetch() }}
      />
    )
  }

  return (
    <div className="space-y-8">
      {/* Backend warning banner */}
      {hasError && (
        <div className="flex items-center gap-3 rounded-xl border border-warning/30 bg-warning-subtle px-4 py-3 text-sm text-warning">
          <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
          <span>Some charts could not be loaded — the backend may be offline or your session may have expired.</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-text-primary">Analytics</h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            Store performance — live aggregates from your ShopCore backend
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <GranularityPicker value={granularity} onChange={setGranularity} />
          {/* Custom date range — overrides the granularity look-back window */}
          <div
            className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs"
            role="group"
            aria-label="Custom date range"
          >
            <Calendar className="h-3.5 w-3.5 shrink-0 text-text-muted" aria-hidden />
            <input
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(e) => setDateFrom(e.target.value)}
              aria-label="Start date"
              className="w-32 bg-transparent text-xs font-medium text-text-primary focus:outline-none [color-scheme:light] dark:[color-scheme:dark]"
            />
            <span className="shrink-0 text-text-muted" aria-hidden>→</span>
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => setDateTo(e.target.value)}
              aria-label="End date"
              className="w-32 bg-transparent text-xs font-medium text-text-primary focus:outline-none [color-scheme:light] dark:[color-scheme:dark]"
            />
            {rangeActive && (
              <button
                type="button"
                onClick={() => { setDateFrom(''); setDateTo('') }}
                aria-label="Clear date range"
                className="shrink-0 rounded-md p-0.5 text-text-muted transition-colors hover:bg-bg-subtle hover:text-text-primary"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-text-muted">
            <BarChart3 className="h-3.5 w-3.5" aria-hidden />
            Live data · {windowLabel}
          </div>
        </div>
      </div>

      {/* KPI grid — row 1 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Orders"
          value={overviewQuery.isLoading ? '…' : formatNumber(totalOrders)}
          icon={<ShoppingCart />}
        />
        <StatCard
          label="Total Revenue"
          value={overviewQuery.isLoading ? '…' : formatCurrency(totalRevenue)}
          icon={<DollarSign />}
        />
        <StatCard
          label="Total Customers"
          value={overviewQuery.isLoading ? '…' : formatNumber(totalCustomers)}
          icon={<Users />}
        />
        <StatCard
          label="Pending Orders"
          value={overviewQuery.isLoading ? '…' : formatNumber(pendingOrders)}
          icon={<Clock />}
        />
      </div>

      {/* KPI grid — row 2 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Products"
          value={overviewQuery.isLoading ? '…' : formatNumber(totalProducts)}
          icon={<Package />}
          suffix={publishedProducts > 0 ? `${formatNumber(publishedProducts)} published` : undefined}
        />
        <StatCard
          label="Total Reviews"
          value={overviewQuery.isLoading ? '…' : formatNumber(totalReviews)}
          icon={<Star />}
          suffix={approvedReviews > 0 ? `${formatNumber(approvedReviews)} approved` : undefined}
        />
        <StatCard
          label="Avg Rating"
          value={overviewQuery.isLoading ? '…' : avgRating.toFixed(2)}
          icon={<Star />}
        />
        <StatCard
          label="Low Stock SKUs"
          value={overviewQuery.isLoading ? '…' : formatNumber(lowStockCount)}
          icon={<AlertTriangle />}
        />
      </div>

      {/* ── Revenue & AOV ─────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue & Average Order Value</CardTitle>
        </CardHeader>
        {revenueQuery.isLoading ? (
          <SectionSkeleton rows={3} />
        ) : revenueQuery.isError ? (
          <ChartError onRetry={() => void revenueQuery.refetch()} />
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatRow label="Avg order value" value={formatCurrency(revenueQuery.data?.all_time.average_order_value ?? 0)} color="text-primary" icon={DollarSign} />
              <StatRow label="Revenue growth" value={`${revenueQuery.data?.revenue_growth_pct ?? 0}%`} color="text-success" icon={TrendingUp} />
              <StatRow label="Orders growth" value={`${revenueQuery.data?.orders_growth_pct ?? 0}%`} color="text-info" icon={ShoppingCart} />
            </div>
            {revenueOverTime.length > 0 ? (
              <div role="img" aria-label="Revenue over time">
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={revenueOverTime} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-light))" />
                    <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: 'hsl(var(--text-muted))' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--text-muted))' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `$${v}`} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [formatCurrency(v), 'Revenue']} />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#revenueFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <ChartEmpty>No revenue data for this period</ChartEmpty>
            )}
          </div>
        )}
      </Card>

      {/* ── Order analytics + customer growth ─────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Order Status Distribution</CardTitle>
            {ordersQuery.data && (
              <span className="text-xs text-text-muted">
                {ordersQuery.data.cancellation_rate_pct}% cancelled
              </span>
            )}
          </CardHeader>
          {ordersQuery.isLoading ? (
            <SectionSkeleton rows={3} />
          ) : ordersQuery.isError ? (
            <ChartError onRetry={() => void ordersQuery.refetch()} />
          ) : statusData.length > 0 ? (
            <div className="flex flex-wrap items-center gap-6 px-6 pb-6">
              <div className="relative h-44 w-44 shrink-0" role="img" aria-label="Order status distribution">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={76} paddingAngle={2} stroke="none">
                      {statusData.map((entry, i) => (
                        <Cell key={entry.name} fill={STATUS_COLOR[entry.name] ?? PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number, name: string) => [formatNumber(v), name]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-bold text-text-primary tabular-nums">
                    {formatNumber(statusTotal)}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-text-muted">orders</span>
                </div>
              </div>
              <ul className="min-w-0 flex-1 space-y-1.5">
                {statusData.map((s, i) => (
                  <li key={s.name} className="flex items-center gap-2 text-xs">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: STATUS_COLOR[s.name] ?? PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="flex-1 truncate text-text-secondary">{s.name}</span>
                    <span className="font-medium tabular-nums text-text-primary">{formatNumber(s.value)}</span>
                    <span className="w-12 text-right tabular-nums text-text-muted">
                      {statusTotal > 0 && s.value > 0 ? `${((s.value / statusTotal) * 100).toFixed(1)}%` : '—'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <ChartEmpty>No orders in this period</ChartEmpty>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer Growth</CardTitle>
            {customersQuery.data && (
              <span className="text-xs text-text-muted">
                {formatNumber(customersQuery.data.total_customers)} total · {formatNumber(customersQuery.data.active_customers)} active
              </span>
            )}
          </CardHeader>
          {customersQuery.isLoading ? (
            <SectionSkeleton rows={3} />
          ) : customersQuery.isError ? (
            <ChartError onRetry={() => void customersQuery.refetch()} />
          ) : customerOverTime.length > 0 ? (
            <div role="img" aria-label="New customers over time">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={customerOverTime} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-light))" />
                  <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: 'hsl(var(--text-muted))' }} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--text-muted))' }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [formatNumber(v), 'New customers']} />
                  <Line type="monotone" dataKey="new_customers" stroke="hsl(var(--info))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <ChartEmpty>No new customers in this period</ChartEmpty>
          )}
        </Card>
      </div>

      {/* ── Top products + inventory ──────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{rangeActive ? 'Top Products' : `Top Products (Last ${analyticsDays} Days)`}</CardTitle>
            <Link to="/catalog/products" className="text-sm font-medium text-primary hover:underline">Manage →</Link>
          </CardHeader>
          {bestSellersQuery.isLoading ? (
            <SectionSkeleton rows={5} />
          ) : bestSellersQuery.isError ? (
            <ChartError onRetry={() => void bestSellersQuery.refetch()} />
          ) : (bestSellersQuery.data?.results ?? []).length > 0 ? (
            <div className="px-4 pb-4" role="img" aria-label="Top products by revenue">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={bestSellersQuery.data!.results} layout="vertical" margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--text-muted))' }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="product_name" tick={{ fontSize: 11, fill: 'hsl(var(--text-muted))' }} tickLine={false} axisLine={false} width={110} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [formatCurrency(v), 'Revenue']} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <ChartEmpty>No sales data in this period</ChartEmpty>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inventory Health</CardTitle>
            {inventoryQuery.data && (
              <span className="text-xs text-text-muted">
                {formatCurrency(inventoryQuery.data.summary.total_inventory_value)} total value
              </span>
            )}
          </CardHeader>
          {inventoryQuery.isLoading ? (
            <SectionSkeleton rows={3} />
          ) : inventoryQuery.isError ? (
            <ChartError onRetry={() => void inventoryQuery.refetch()} />
          ) : inventory ? (
            <div className="space-y-4 px-6 pb-6">
              <div className="flex items-center gap-6">
                <div className="relative h-36 w-36 shrink-0" role="img" aria-label="Inventory stock health">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={invDonut} dataKey="value" nameKey="name" innerRadius={44} outerRadius={64} paddingAngle={2} stroke="none">
                        {invDonut.map((entry, i) => (
                          <Cell key={entry.name} fill={INV_COLORS[i % INV_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number, name: string) => [formatNumber(v), name]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold text-text-primary tabular-nums">{formatNumber(inventory.total_sku_count)}</span>
                    <span className="text-[10px] uppercase tracking-wider text-text-muted">SKUs</span>
                  </div>
                </div>
                <ul className="min-w-0 flex-1 space-y-2">
                  {invDonut.map((entry, i) => (
                    <li key={entry.name} className="flex items-center gap-2 text-xs">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: INV_COLORS[i % INV_COLORS.length] }} />
                      <span className="flex-1 text-text-secondary">{entry.name}</span>
                      <span className="font-medium tabular-nums text-text-primary">{formatNumber(entry.value)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {warehouses.length > 0 && (
                <div className="space-y-1.5 border-t border-border-light pt-3">
                  {warehouses.slice(0, 5).map((w) => (
                    <div key={w.warehouse_code ?? w.warehouse_name ?? 'warehouse'} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-text-secondary">
                        <Warehouse className="h-3.5 w-3.5 text-text-muted" aria-hidden />
                        {w.warehouse_name ?? 'Unassigned'}
                      </span>
                      <span className="tabular-nums text-text-primary">
                        {formatNumber(w.sku_count)} SKUs · {formatNumber(w.total_on_hand)} units
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <ChartEmpty>No inventory data</ChartEmpty>
          )}
        </Card>
      </div>

      {/* ── Newsletter + coupons ──────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Newsletter Growth</CardTitle>
            {newsletterQuery.data && (
              <span className="text-xs text-text-muted">
                {formatNumber(newsletterQuery.data.total_subscribers)} total · {formatNumber(newsletterQuery.data.active_subscribers)} active
              </span>
            )}
          </CardHeader>
          {newsletterQuery.isLoading ? (
            <SectionSkeleton rows={3} />
          ) : newsletterQuery.isError ? (
            <ChartError onRetry={() => void newsletterQuery.refetch()} />
          ) : newsletterOverTime.length > 0 ? (
            <div className="px-4 pb-4" role="img" aria-label="New newsletter subscribers over time">
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={newsletterOverTime} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="subFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-light))" />
                  <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: 'hsl(var(--text-muted))' }} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--text-muted))' }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [formatNumber(v), 'New subscribers']} />
                  <Area type="monotone" dataKey="new_subscribers" stroke="hsl(var(--success))" strokeWidth={2} fill="url(#subFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <ChartEmpty>No subscriber growth in this period</ChartEmpty>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{rangeActive ? 'Coupon Usage' : `Coupon Usage (Last ${analyticsDays} Days)`}</CardTitle>
            {couponsQuery.data && (
              <span className="text-xs text-text-muted">
                {formatCurrency(couponsQuery.data.period_total_discount)} discounted
              </span>
            )}
          </CardHeader>
          {couponsQuery.isLoading ? (
            <SectionSkeleton rows={4} />
          ) : couponsQuery.isError ? (
            <ChartError onRetry={() => void couponsQuery.refetch()} />
          ) : (couponsQuery.data?.top_coupons_this_period ?? []).length > 0 ? (
            <div className="space-y-2 px-6 pb-6">
              {couponsQuery.data!.top_coupons_this_period.slice(0, 6).map((c, i) => (
                <div key={c.coupon_code ?? i} className="flex items-center justify-between gap-3 rounded-lg bg-bg-subtle px-4 py-2.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <Tag className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                    <span className="truncate text-sm font-medium text-text-primary">{c.coupon_code ?? '—'}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-4 text-xs">
                    <span className="tabular-nums text-text-muted">{formatNumber(c.times_used)} uses</span>
                    <span className="w-20 text-right font-medium tabular-nums text-text-primary">
                      {formatCurrency(c.total_discount)}
                    </span>
                  </div>
                </div>
              ))}
              <p className="pt-1 text-xs text-text-muted">
                {formatNumber(couponsQuery.data!.period_coupon_orders)} orders used a coupon this period
              </p>
            </div>
          ) : (
            <ChartEmpty>No coupon usage in this period</ChartEmpty>
          )}
        </Card>
      </div>

      {/* ── Detail panels ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Order highlights */}
        <Card padding="none">
          <CardHeader className="px-6 py-5">
            <CardTitle>Order Highlights</CardTitle>
            <Link to="/orders" className="text-sm font-medium text-primary hover:underline">
              View all →
            </Link>
          </CardHeader>
          {overviewQuery.isLoading ? (
            <SectionSkeleton rows={4} />
          ) : (
            <div className="space-y-2 px-6 pb-6">
              <StatRow label="Total orders" value={formatNumber(totalOrders)} color="text-primary" icon={ShoppingCart} />
              <StatRow
                label="Pending orders"
                value={formatNumber(pendingOrders)}
                color={pendingOrders > 0 ? 'text-warning' : 'text-text-muted'}
                icon={Clock}
              />
              <StatRow label="Total revenue" value={formatCurrency(totalRevenue)} color="text-success" icon={DollarSign} />
              <StatRow label="Total customers" value={formatNumber(totalCustomers)} color="text-info" icon={Users} />
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
            {overviewQuery.isLoading ? (
              <SectionSkeleton rows={3} />
            ) : (
              <div className="space-y-3 px-6 pb-6">
                <CatalogBar label="Published" count={publishedProducts} total={totalProducts} color="bg-success" />
                <CatalogBar label="Draft" count={draftProducts} total={totalProducts} color="bg-warning" />
                <CatalogBar label="Archived" count={archivedProducts} total={totalProducts} color="bg-border" />
                <p className="pt-1 text-xs text-text-muted">
                  {formatNumber(totalProducts)} total products across all statuses.
                </p>
                <div className={cn(
                  'flex items-center justify-between rounded-lg px-4 py-3 mt-1',
                  lowStockCount > 0 ? 'bg-warning-subtle' : 'bg-bg-subtle'
                )}>
                  <div className="flex items-center gap-2">
                    <AlertTriangle
                      className={cn('h-4 w-4', lowStockCount > 0 ? 'text-warning' : 'text-text-muted')}
                      aria-hidden
                    />
                    <span className="text-sm text-text-secondary">Low stock SKUs</span>
                  </div>
                  <Badge variant={lowStockCount > 0 ? 'danger' : 'default'}>
                    {overviewQuery.isLoading ? '…' : formatNumber(lowStockCount)}
                  </Badge>
                </div>
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
            {overviewQuery.isLoading ? (
              <SectionSkeleton rows={2} />
            ) : (
              <div className="space-y-3 px-6 pb-6">
                <div className="flex items-center justify-between rounded-lg bg-bg-subtle px-4 py-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />
                    <span className="text-sm text-text-secondary">Approved</span>
                  </div>
                  <span className="font-semibold tabular-nums text-text-primary">
                    {formatNumber(approvedReviews)}
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
                    {formatNumber(pendingReviews)}
                  </Badge>
                </div>
                {pendingReviews > 0 && (
                  <Link
                    to="/reviews"
                    className="block w-full rounded-lg border border-warning/30 bg-warning-subtle px-4 py-2.5 text-center text-sm font-medium text-warning transition-colors hover:bg-warning/20"
                  >
                    Review {formatNumber(pendingReviews)} pending {pendingReviews === 1 ? 'submission' : 'submissions'} →
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
