import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import {
  DollarSign, ShoppingCart, Users, AlertTriangle,
  Package, TrendingUp,
} from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { Link } from 'react-router-dom'
import { dashboardService } from '@/services/api/dashboard.service'
import { ordersService } from '@/services/api/orders.service'
import { StatCard } from '@/components/ui/StatCard'
import { Card, CardTitle, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton, StatCardSkeleton } from '@/components/feedback/Skeleton'
import { ErrorState } from '@/components/feedback/ErrorState'
import { formatCurrency, formatDate } from '@/utils/format'

export function DashboardPage() {
  const { isAuthenticated } = useAuth()

  const { data: kpis, isLoading: kpiLoading, error: kpiError } = useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: () => dashboardService.getOverview(),
    staleTime: 60_000,
    enabled: isAuthenticated,
  })

  const { data: revenueData, isLoading: revenueLoading, error: revenueError } = useQuery({
    queryKey: ['dashboard-revenue', 'week'],
    queryFn: () => dashboardService.getRevenue({ period: 'week' }),
    staleTime: 60_000,
    enabled: isAuthenticated,
  })

  const { data: bestSellers, isLoading: sellersLoading, error: sellersError } = useQuery({
    queryKey: ['dashboard-best-sellers'],
    queryFn: () => dashboardService.getBestSellers(),
    staleTime: 60_000,
    enabled: isAuthenticated,
  })

  const { data: recentOrders, isLoading: ordersLoading, error: ordersError } = useQuery({
    queryKey: ['dashboard-recent-orders'],
    // ordering is supported by the backend filter backends
    queryFn: () => ordersService.listOrders({ page: 1, page_size: 5, ordering: '-created_at' }),
    staleTime: 60_000,
    enabled: isAuthenticated,
  })

  if (kpiError) {
    return <ErrorState description="Could not load dashboard data." />
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

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-lg font-semibold text-text-primary">Dashboard</h1>
        <p className="text-sm text-text-muted">Overview of your store performance</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpiLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              label="Total Revenue"
              value={kpis?.total_revenue ? formatCurrency(kpis.total_revenue) : '—'}
              icon={<DollarSign />}
              trend={kpis?.revenue_change_pct}
            />
            <StatCard
              label="Total Orders"
              value={kpis?.total_orders ?? '—'}
              icon={<ShoppingCart />}
              trend={kpis?.orders_change_pct}
            />
            <StatCard
              label="Customers"
              value={kpis?.total_customers ?? '—'}
              icon={<Users />}
              trend={kpis?.customers_change_pct}
            />
            <StatCard
              label="Low Stock SKUs"
              value={kpis?.low_stock_count ?? '—'}
              icon={<AlertTriangle />}
            />
          </>
        )}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Revenue chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue (Last 7 Days)</CardTitle>
          </CardHeader>
          {revenueLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : revenueError ? (
            <div className="flex h-48 items-center justify-center text-sm text-text-muted">Backend unreachable — start the Django server to see revenue data.</div>
          ) : revenueData && revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={revenueData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-light))" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--text-muted))' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--text-muted))' }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--surface-elevated))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }}
                  formatter={(v: number) => [formatCurrency(v), 'Revenue']}
                />
                <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-48 items-center justify-center text-sm text-text-muted">No revenue data yet</div>
          )}
        </Card>

        {/* Best sellers */}
        <Card>
          <CardHeader>
            <CardTitle>Top Products</CardTitle>
          </CardHeader>
          {sellersLoading ? (
            <Skeleton rows={5} height="28px" />
          ) : sellersError ? (
            <div className="flex h-48 items-center justify-center text-sm text-text-muted">Backend unreachable — start the Django server to see top products.</div>
          ) : bestSellers && bestSellers.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={bestSellers.slice(0, 5)} layout="vertical" margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--text-muted))' }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="product_name" tick={{ fontSize: 11, fill: 'hsl(var(--text-muted))' }} tickLine={false} axisLine={false} width={90} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--surface-elevated))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }}
                  formatter={(v: number) => [formatCurrency(v), 'Revenue']}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-48 items-center justify-center text-sm text-text-muted">No sales data yet</div>
          )}
        </Card>
      </div>

      {/* Recent orders */}
      <Card padding="none">
        <div className="flex items-center justify-between border-b border-border p-5">
          <CardTitle>Recent Orders</CardTitle>
          {/* Fix L-6: use React Router Link instead of bare <a> to avoid full page reload */}
          <Link to="/orders" className="text-xs font-medium text-primary hover:underline">View all</Link>
        </div>
        {ordersLoading ? (
          <Skeleton rows={5} className="m-4" height="40px" />
        ) : ordersError ? (
          <p className="px-5 py-8 text-center text-sm text-text-muted">Backend unreachable — start the Django server to see recent orders.</p>
        ) : (
          <div className="divide-y divide-border-light">
            {recentOrders?.results.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-text-muted">No orders yet</p>
            )}
            {recentOrders?.results.map((order) => (
              <div key={order.order_number} className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-bg-subtle">
                    <Package className="h-4 w-4 text-text-muted" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">#{order.order_number}</p>
                    <p className="text-xs text-text-muted">{order.user_email ?? order.user?.email ?? '—'} · {formatDate(order.created_at)}</p>
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
    </div>
  )
}
