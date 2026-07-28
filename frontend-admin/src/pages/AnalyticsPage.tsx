import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import { dashboardService, type AnalyticsParams } from '@/services/api/dashboard.service'
import { Card, CardTitle, CardHeader } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/feedback/Skeleton'
import { formatCurrency } from '@/utils/format'

type Period = AnalyticsParams['period']

export function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>('week')

  const { data: revenueData, isLoading: revLoading } = useQuery({
    queryKey: ['analytics-revenue', period],
    queryFn: () => dashboardService.getRevenue({ period }),
  })

  const { data: orderData, isLoading: ordLoading } = useQuery({
    queryKey: ['analytics-orders', period],
    queryFn: () => dashboardService.getOrderVolume({ period }),
  })

  const { data: bestSellers, isLoading: sellersLoading } = useQuery({
    queryKey: ['analytics-best-sellers'],
    queryFn: () => dashboardService.getBestSellers(),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Analytics</h1>
          <p className="text-sm text-text-muted">Store performance at a glance</p>
        </div>
        <Select value={period} onChange={(e) => setPeriod(e.target.value as Period)} className="w-32">
          <option value="day">Today</option>
          <option value="week">This week</option>
          <option value="month">This month</option>
          <option value="year">This year</option>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Revenue */}
        <Card>
          <CardHeader><CardTitle>Revenue</CardTitle></CardHeader>
          {revLoading ? <Skeleton className="h-56 w-full" /> : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={revenueData ?? []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-light))" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--text-muted))' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--text-muted))' }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip contentStyle={{ background: 'hsl(var(--surface-elevated))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [formatCurrency(v), 'Revenue']} />
                <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Order volume */}
        <Card>
          <CardHeader><CardTitle>Order Volume</CardTitle></CardHeader>
          {ordLoading ? <Skeleton className="h-56 w-full" /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={orderData ?? []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-light))" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--text-muted))' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--text-muted))' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: 'hsl(var(--surface-elevated))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Best sellers */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Top Products by Revenue</CardTitle></CardHeader>
          {sellersLoading ? <Skeleton className="h-56 w-full" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={(bestSellers ?? []).slice(0, 10)} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--text-muted))' }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                <YAxis type="category" dataKey="product_name" tick={{ fontSize: 11, fill: 'hsl(var(--text-muted))' }} tickLine={false} axisLine={false} width={120} />
                <Tooltip contentStyle={{ background: 'hsl(var(--surface-elevated))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [formatCurrency(v), 'Revenue']} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  )
}
