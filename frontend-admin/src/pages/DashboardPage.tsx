import { useQuery } from '@tanstack/react-query'
import {
  DollarSign, ShoppingCart, Users, Package, Star,
  TrendingUp, TrendingDown, ChevronRight, Home, ArrowRight,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell,
} from 'recharts'
import { Badge } from '@/components/ui/Badge'
import { ordersService } from '@/services/api/orders.service'
import { catalogService } from '@/services/api/catalog.service'
import { reviewsService } from '@/services/api/reviews.service'
import { newsletterService } from '@/services/api/newsletter.service'
import { formatCurrency, formatDate } from '@/utils/format'
import type { Order } from '@/types/models'

// ─── Helpers ─────────────────────────────────────────────────────────────────
type OrderStatusVariant = 'warning' | 'success' | 'info' | 'danger' | 'default'
function orderStatusBadge(status: string): { label: string; variant: OrderStatusVariant } {
  const map: Record<string, { label: string; variant: OrderStatusVariant }> = {
    PENDING_PAYMENT: { label: 'Pending',    variant: 'warning' },
    PAID:            { label: 'Paid',       variant: 'info' },
    PROCESSING:      { label: 'Processing', variant: 'info' },
    SHIPPED:         { label: 'Shipped',    variant: 'info' },
    DELIVERED:       { label: 'Delivered',  variant: 'success' },
    CANCELLED:       { label: 'Cancelled',  variant: 'danger' },
    REFUNDED:        { label: 'Refunded',   variant: 'danger' },
  }
  return map[status] ?? { label: status, variant: 'default' }
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
  title, value, trend, iconBg, Icon, loading,
}: {
  title: string
  value: string | number
  trend?: number
  iconBg: string
  Icon: React.ElementType
  loading?: boolean
}) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-surface p-5 shadow-xs">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="h-3 w-24 animate-pulse rounded bg-skeleton" />
            <div className="h-7 w-32 animate-pulse rounded bg-skeleton" />
          </div>
          <div className="h-11 w-11 animate-pulse rounded-xl bg-skeleton" />
        </div>
        <div className="mt-3 h-3 w-40 animate-pulse rounded bg-skeleton" />
      </div>
    )
  }
  const isPositive = (trend ?? 0) >= 0
  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-xs transition-shadow hover:shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-body-sm font-medium text-text-muted">{title}</p>
          <p className="mt-1 text-heading-md font-bold text-text-primary">{value}</p>
        </div>
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          style={{ background: iconBg }}
        >
          <Icon className="h-5 w-5 text-white" aria-hidden />
        </div>
      </div>
      {trend !== undefined && (
        <div className="mt-3 flex items-center gap-1.5">
          {isPositive
            ? <TrendingUp className="h-3.5 w-3.5 text-success" aria-hidden />
            : <TrendingDown className="h-3.5 w-3.5 text-danger" aria-hidden />}
          <span className={`text-body-sm font-semibold ${isPositive ? 'text-success' : 'text-danger'}`}>
            {isPositive ? '+' : ''}{trend}%
          </span>
          <span className="text-caption text-text-muted">vs last month</span>
        </div>
      )}
    </div>
  )
}

// ─── Sparkline data (illustrative — replace with real analytics API) ──────────
const salesPoints = [
  { date: 'May 20', value: 3200 },
  { date: 'May 25', value: 5800 },
  { date: 'May 30', value: 4100 },
  { date: 'Jun 4',  value: 7200 },
  { date: 'Jun 9',  value: 5400 },
  { date: 'Jun 14', value: 8900 },
  { date: 'Jun 20', value: 7600 },
]

const orderStatusColors: Record<string, string> = {
  PENDING_PAYMENT: '#f59e0b',
  PAID:            '#3b82f6',
  PROCESSING:      '#8b5cf6',
  SHIPPED:         '#06b6d4',
  DELIVERED:       '#10b981',
  CANCELLED:       '#ef4444',
  REFUNDED:        '#f43f5e',
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ title, to }: { title: string; to: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-border">
      <h2 className="text-body-sm font-semibold text-text-primary">{title}</h2>
      <Link
        to={to}
        className="flex items-center gap-1 text-caption font-medium text-primary hover:underline"
      >
        View all <ArrowRight className="h-3 w-3" aria-hidden />
      </Link>
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export function DashboardPage() {
  const ordersQuery = useQuery({
    queryKey: ['admin-dashboard-orders'],
    queryFn: () => ordersService.getOrders({ page_size: 6 }),
    staleTime: 30_000,
  })

  const productsQuery = useQuery({
    queryKey: ['admin-dashboard-products'],
    queryFn: () => catalogService.getProducts({ page_size: 1 }),
    staleTime: 60_000,
  })


  const reviewsQuery = useQuery({
    queryKey: ['admin-dashboard-reviews'],
    queryFn: () => reviewsService.getReviews({ page_size: 1 }),
    staleTime: 30_000,
  })

  const newsletterStatsQuery = useQuery({
    queryKey: ['admin-dashboard-newsletter-stats'],
    queryFn: () => newsletterService.getStats(),
    staleTime: 60_000,
  })

  const recentOrders = ordersQuery.data?.results ?? []
  const totalRevenue = recentOrders.reduce((s, o) => s + parseFloat(o.grand_total || '0'), 0)
  const ordersTotal = ordersQuery.data?.count ?? 0
  const productsTotal = productsQuery.data?.count ?? 0
  const reviewsTotal = reviewsQuery.data?.count ?? 0

  // Build order-status distribution from recent orders
  const statusCounts = recentOrders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1
    return acc
  }, {})
  const pieData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }))

  const ns = newsletterStatsQuery.data

  return (
    <div className="space-y-6">
      {/* Breadcrumb + heading */}
      <div className="flex items-center justify-between">
        <div>
          <div className="mb-1 flex items-center gap-1.5 text-caption text-text-muted">
            <Home className="h-3 w-3" aria-hidden />
            <ChevronRight className="h-3 w-3" aria-hidden />
            <span className="font-medium text-text-secondary">Dashboard</span>
          </div>
          <h1 className="text-heading-md font-bold text-text-primary">Dashboard</h1>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(totalRevenue)}
          trend={10.1}
          iconBg="#3b5bdb"
          Icon={DollarSign}
          loading={ordersQuery.isLoading}
        />
        <StatCard
          title="Orders"
          value={ordersTotal.toLocaleString()}
          trend={8.3}
          iconBg="#10b981"
          Icon={ShoppingCart}
          loading={ordersQuery.isLoading}
        />
        <StatCard
          title="Products"
          value={productsTotal.toLocaleString()}
          trend={5.7}
          iconBg="#06b6d4"
          Icon={Package}
          loading={productsQuery.isLoading}
        />
        <StatCard
          title="Reviews"
          value={reviewsTotal.toLocaleString()}
          trend={14.6}
          iconBg="#f59e0b"
          Icon={Star}
          loading={reviewsQuery.isLoading}
        />
        <StatCard
          title="Subscribers"
          value={(ns?.active_subscribers ?? 0).toLocaleString()}
          trend={ns && ns.new_last_month > 0
            ? Math.round(((ns.new_this_month - ns.new_last_month) / ns.new_last_month) * 100)
            : undefined}
          iconBg="#8b5cf6"
          Icon={Users}
          loading={newsletterStatsQuery.isLoading}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Sales overview */}
        <div className="rounded-xl border border-border bg-surface p-5 shadow-xs xl:col-span-7">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-body-sm font-semibold text-text-primary">Sales Overview</h2>
            <span className="text-caption text-text-muted">Last 30 days</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={salesPoints} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: 'hsl(var(--text-muted))' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'hsl(var(--text-muted))' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  border: 'none',
                  borderRadius: 10,
                  boxShadow: '0 4px 16px rgba(0,0,0,.12)',
                  background: 'hsl(var(--surface))',
                  color: 'hsl(var(--text-primary))',
                }}
                formatter={(v) => [`$${Number(v).toLocaleString()}`, 'Revenue']}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                dot={{ r: 3, fill: 'hsl(var(--primary))', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: 'hsl(var(--primary))', strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Order status donut */}
        <div className="rounded-xl border border-border bg-surface p-5 shadow-xs xl:col-span-5">
          <h2 className="mb-3 text-body-sm font-semibold text-text-primary">Order Status</h2>
          {pieData.length > 0 ? (
            <>
              <div className="relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={68}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={orderStatusColors[entry.name] ?? '#94a3b8'}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-heading-sm font-bold text-text-primary">
                    {recentOrders.length}
                  </p>
                  <p className="text-caption text-text-muted">shown</p>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
                {pieData.map((entry) => {
                  const { label } = orderStatusBadge(entry.name)
                  return (
                    <div key={entry.name} className="flex items-center gap-1.5">
                      <div
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: orderStatusColors[entry.name] ?? '#94a3b8' }}
                      />
                      <span className="text-caption text-text-muted">{label}</span>
                      <span className="ml-auto text-caption font-medium text-text-secondary">
                        {entry.value}
                      </span>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="flex h-40 items-center justify-center text-caption text-text-muted">
              {ordersQuery.isLoading ? 'Loading…' : 'No order data'}
            </div>
          )}
        </div>
      </div>

      {/* Tables row */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Recent orders */}
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-xs xl:col-span-7">
          <SectionHeader title="Recent Orders" to="/orders" />
          {ordersQuery.isLoading ? (
            <div className="space-y-px p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-skeleton" />
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-caption text-text-muted">
              No orders yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-background-subtle">
                    {['Order', 'Customer', 'Status', 'Total', 'Date'].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-text-muted"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentOrders.map((o: Order) => {
                    const { label, variant } = orderStatusBadge(o.status)
                    return (
                      <tr
                        key={o.order_number}
                        className="transition-colors hover:bg-background-subtle/50"
                      >
                        <td className="px-5 py-3">
                          <Link
                            to={`/orders/${o.order_number}`}
                            className="font-mono text-body-sm font-semibold text-primary hover:underline"
                          >
                            #{o.order_number}
                          </Link>
                        </td>
                        <td className="px-5 py-3 text-body-sm text-text-secondary">
                          {o.user_email ?? '—'}
                        </td>
                        <td className="px-5 py-3">
                          <Badge variant={variant} dot>{label}</Badge>
                        </td>
                        <td className="px-5 py-3 text-body-sm font-semibold text-text-primary">
                          {formatCurrency(parseFloat(o.grand_total || '0'))}
                        </td>
                        <td className="px-5 py-3 text-caption text-text-muted">
                          {formatDate(o.created_at)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Newsletter summary */}
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-xs xl:col-span-5">
          <SectionHeader title="Newsletter Summary" to="/marketing" />
          {newsletterStatsQuery.isLoading ? (
            <div className="space-y-1 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-skeleton" />
              ))}
            </div>
          ) : ns ? (
            <div className="divide-y divide-border">
              {[
                { emoji: '👥', label: 'Total Subscribers', value: ns.total_subscribers.toLocaleString() },
                { emoji: '✅', label: 'Active',            value: ns.active_subscribers.toLocaleString() },
                { emoji: '📅', label: 'New This Month',    value: ns.new_this_month.toLocaleString() },
                { emoji: '📧', label: 'Campaigns Sent',    value: ns.campaigns_sent.toLocaleString() },
                { emoji: '📊', label: 'Avg Open Rate',     value: `${ns.avg_open_rate}%` },
                { emoji: '🖱️', label: 'Avg Click Rate',    value: `${ns.avg_click_rate}%` },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background-subtle text-base">
                    {item.emoji}
                  </div>
                  <span className="flex-1 text-body-sm text-text-secondary">{item.label}</span>
                  <span className="text-body-sm font-bold text-text-primary">{item.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center text-caption text-text-muted">
              No data available
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Manage Products', to: '/catalog/products', icon: Package },
          { label: 'View Inventory',  to: '/catalog/inventory', icon: Package },
          { label: 'All Customers',   to: '/customers',         icon: Users },
          { label: 'Marketing',       to: '/marketing',         icon: Users },
        ].map(({ label, to, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3.5 text-body-sm font-medium text-text-secondary shadow-xs transition-all hover:border-primary/40 hover:bg-primary-light hover:text-primary"
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            {label}
          </Link>
        ))}
      </div>
    </div>
  )
}
