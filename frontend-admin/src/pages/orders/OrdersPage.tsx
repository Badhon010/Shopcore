import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { ShoppingCart } from 'lucide-react'
import { ordersService } from '@/services/api/orders.service'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { SearchBar } from '@/components/ui/SearchBar'
import { Pagination } from '@/components/ui/Pagination'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { useDebounce } from '@/utils/useDebounce'
import { formatCurrency, formatDateTime } from '@/utils/format'
import type { Order } from '@/types/models'

const STATUS_VARIANT = {
  DELIVERED: 'success', SHIPPED: 'info', PROCESSING: 'info',
  PAID: 'success', PENDING_PAYMENT: 'warning', CANCELLED: 'danger', REFUNDED: 'default',
} as const

const PAYMENT_STATUS_VARIANT = {
  PAID: 'success', PENDING: 'warning', FAILED: 'danger', REFUNDED: 'default',
} as const

export function OrdersPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const debouncedSearch = useDebounce(search)
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-orders', page, debouncedSearch, statusFilter, paymentFilter, dateFrom, dateTo],
    queryFn: () => ordersService.listOrders({
      page,
      search: debouncedSearch || undefined,
      status: statusFilter || undefined,
      payment_status: paymentFilter || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    }),
    enabled: isAuthenticated,
  })

  const columns: Column<Order>[] = [
    {
      key: 'order_number', header: 'Order',
      render: (row) => (
        <button className="text-left hover:underline" onClick={() => navigate(`/orders/${row.order_number}`)}>
          <p className="font-medium text-primary">#{row.order_number}</p>
          <p className="text-xs text-text-muted">{formatDateTime(row.created_at)}</p>
        </button>
      ),
    },
    {
      key: 'customer', header: 'Customer',
      render: (row) => {
        const name =
          row.user_email ??
          row.user?.email ??
          row.shipping_address_snapshot?.full_name ??
          '—'
        return <span className="text-text-secondary">{name}</span>
      },
    },
    {
      key: 'status', header: 'Status',
      render: (row) => <Badge variant={STATUS_VARIANT[row.status] ?? 'default'}>{row.status}</Badge>,
    },
    {
      key: 'payment', header: 'Payment',
      render: (row) => <Badge variant={PAYMENT_STATUS_VARIANT[row.payment_status] ?? 'default'}>{row.payment_status}</Badge>,
    },
    { key: 'total', header: 'Total', align: 'right', render: (row) => <span className="font-medium text-text-primary">{formatCurrency(row.grand_total)}</span> },
  ]

  const totalPages = Math.ceil((data?.count ?? 0) / 20)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-text-primary">Orders</h1>
        <p className="text-sm text-text-muted">{data?.count ?? 0} total orders</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchBar
          value={search}
          onChange={(v) => { setSearch(v); setPage(1) }}
          placeholder="Search order #, customer…"
          className="w-64"
        />
        <Select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="w-40"
        >
          <option value="">All statuses</option>
          {['PENDING_PAYMENT', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Select>
        <Select
          value={paymentFilter}
          onChange={(e) => { setPaymentFilter(e.target.value); setPage(1) }}
          className="w-40"
        >
          <option value="">All payments</option>
          <option value="PENDING">Pending</option>
          <option value="PAID">Paid</option>
          <option value="FAILED">Failed</option>
          <option value="REFUNDED">Refunded</option>
        </Select>
        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
            className="w-36 text-sm"
            placeholder="From"
            aria-label="Date from"
          />
          <span className="text-text-muted text-sm">–</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
            className="w-36 text-sm"
            placeholder="To"
            aria-label="Date to"
          />
        </div>
      </div>

      <div className="admin-surface overflow-hidden">
        <DataTable
          columns={columns}
          data={data?.results ?? []}
          isLoading={isLoading}
          error={error ? 'Failed to load orders.' : null}
          onRetry={refetch}
          rowKey={(r) => r.order_number}
          emptyTitle="No orders found"
          emptyDescription="Orders will appear here once customers complete a purchase."
          emptyIcon={<ShoppingCart />}
        />
        {totalPages > 1 && (
          <div className="flex justify-end border-t border-border p-4">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>
    </div>
  )
}
