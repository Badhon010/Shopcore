import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ClipboardList } from 'lucide-react'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { SearchBar } from '@/components/ui/SearchBar'
import { Select } from '@/components/ui/Select'
import { Pagination } from '@/components/ui/Pagination'
import { ordersService } from '@/services/api/orders.service'
import { formatCurrency, formatDate } from '@/utils/format'
import type { Order, OrderStatus } from '@/types/models'

type BadgeVariant = 'warning' | 'info' | 'success' | 'danger' | 'default'

function orderStatusBadge(status: string): { label: string; variant: BadgeVariant } {
  const map: Record<string, { label: string; variant: BadgeVariant }> = {
    PENDING_PAYMENT: { label: 'Pending Payment', variant: 'warning' },
    PAID: { label: 'Paid', variant: 'info' },
    PROCESSING: { label: 'Processing', variant: 'info' },
    SHIPPED: { label: 'Shipped', variant: 'info' },
    DELIVERED: { label: 'Delivered', variant: 'success' },
    CANCELLED: { label: 'Cancelled', variant: 'danger' },
    REFUNDED: { label: 'Refunded', variant: 'danger' },
  }
  return map[status] ?? { label: status, variant: 'default' }
}

function paymentBadge(status: string): { label: string; variant: BadgeVariant } {
  const map: Record<string, { label: string; variant: BadgeVariant }> = {
    PENDING: { label: 'Pending', variant: 'warning' },
    PAID: { label: 'Paid', variant: 'success' },
    FAILED: { label: 'Failed', variant: 'danger' },
    REFUNDED: { label: 'Refunded', variant: 'danger' },
  }
  return map[status] ?? { label: status, variant: 'default' }
}

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'PENDING_PAYMENT', label: 'Pending Payment' },
  { value: 'PAID', label: 'Paid' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'REFUNDED', label: 'Refunded' },
]

export function OrdersPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', page, search, status],
    queryFn: () =>
      ordersService.getOrders({
        page,
        page_size: 20,
        search: search || undefined,
        status: (status as OrderStatus) || undefined,
      }),
  })

  const columns: Column<Order>[] = [
    {
      key: 'order_number',
      header: 'Order',
      cell: (o) => (
        <span className="font-mono text-body-sm font-semibold text-primary">
          #{o.order_number}
        </span>
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
      key: 'payment',
      header: 'Payment',
      cell: (o) => {
        const { label, variant } = paymentBadge(o.payment_status)
        return <Badge variant={variant}>{label}</Badge>
      },
    },
    {
      key: 'total',
      header: 'Total',
      cell: (o) => (
        <span className="font-semibold text-text-primary">{formatCurrency(o.grand_total)}</span>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      cell: (o) => <span className="text-body-sm text-text-muted">{formatDate(o.created_at)}</span>,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-heading-lg font-bold text-text-primary">Orders</h1>
        <p className="mt-0.5 text-body-sm text-text-secondary">
          {data?.count ?? 0} total orders
        </p>
      </div>

      <Card noPadding>
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <SearchBar
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            onClear={() => { setSearch(''); setPage(1) }}
            placeholder="Search order # or email…"
            containerClassName="w-full max-w-xs"
          />
          <Select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1) }}
            className="h-10 w-48"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </div>

        <DataTable
          columns={columns}
          data={data?.results ?? []}
          isLoading={isLoading}
          keyExtractor={(o) => o.id}
          emptyIcon={ClipboardList}
          emptyTitle="No orders found"
          emptyDescription="Orders placed by customers will appear here."
          onRowClick={(o) => navigate(`/orders/${o.order_number}`)}
        />

        {data && data.count > 20 && (
          <div className="border-t border-border px-4 py-4">
            <Pagination page={page} pageSize={20} total={data.count} onPageChange={setPage} />
          </div>
        )}
      </Card>
    </div>
  )
}
