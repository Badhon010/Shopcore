import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ClipboardList } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { FormField } from '@/components/ui/FormField'
import { Skeleton } from '@/components/feedback/Skeleton'
import { ordersService } from '@/services/api/orders.service'
import { useToast } from '@/contexts/ToastContext'
import { formatCurrency, formatDateTime } from '@/utils/format'
import type { OrderStatus } from '@/types/models'
import type { ApiError } from '@/types/api'

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

const STATUS_OPTIONS: Array<{ value: OrderStatus; label: string }> = [
  { value: 'PENDING_PAYMENT', label: 'Pending Payment' },
  { value: 'PAID', label: 'Paid' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'REFUNDED', label: 'Refunded' },
]

function AddressBlock({ snapshot }: { snapshot: Record<string, unknown> }) {
  if (!snapshot || Object.keys(snapshot).length === 0) return <span className="text-text-muted">—</span>
  return (
    <address className="not-italic text-body-sm text-text-secondary leading-relaxed">
      {snapshot.first_name as string} {snapshot.last_name as string}<br />
      {snapshot.line1 as string}<br />
      {snapshot.city as string}, {snapshot.state as string} {snapshot.postal_code as string}<br />
      {snapshot.country as string}
    </address>
  )
}

export function OrderDetailPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [newStatus, setNewStatus] = useState<OrderStatus | ''>('')
  const [note, setNote] = useState('')

  const { data: order, isLoading } = useQuery({
    queryKey: ['admin-order', orderNumber],
    queryFn: () => ordersService.getOrder(orderNumber!),
    enabled: !!orderNumber,
  })

  const transitionMutation = useMutation({
    mutationFn: () => ordersService.transitionOrder(orderNumber!, newStatus as OrderStatus, note || undefined),
    onSuccess: (updated) => {
      queryClient.setQueryData(['admin-order', orderNumber], updated)
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
      toast({ title: 'Order status updated', variant: 'success' })
      setNewStatus('')
      setNote('')
    },
    onError: (e: ApiError) => toast({ title: e.message, variant: 'error' }),
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  if (!order) return null

  const statusCfg = orderStatusBadge(order.status)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon-sm" onClick={() => navigate('/orders')} aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Breadcrumbs items={[
          { label: 'Dashboard', to: '/' },
          { label: 'Orders', to: '/orders' },
          { label: `#${order.order_number}` },
        ]} />
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-heading-lg font-bold text-text-primary">Order #{order.order_number}</h1>
          <div className="mt-1 flex items-center gap-3">
            <Badge variant={statusCfg.variant} dot>{statusCfg.label}</Badge>
            <span className="text-body-sm text-text-muted">{formatDateTime(order.created_at)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Order items */}
          <Card noPadding>
            <CardHeader className="px-6 py-5">
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <div className="border-t border-border">
              <table className="w-full text-left text-body-sm">
                <thead>
                  <tr className="border-b border-border bg-bg-subtle">
                    <th className="px-6 py-3 font-semibold text-text-muted uppercase text-overline tracking-wide">Product</th>
                    <th className="px-4 py-3 font-semibold text-text-muted uppercase text-overline tracking-wide">SKU</th>
                    <th className="px-4 py-3 text-right font-semibold text-text-muted uppercase text-overline tracking-wide">Qty</th>
                    <th className="px-4 py-3 text-right font-semibold text-text-muted uppercase text-overline tracking-wide">Unit</th>
                    <th className="px-6 py-3 text-right font-semibold text-text-muted uppercase text-overline tracking-wide">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 font-medium text-text-primary">{item.product_name}</td>
                      <td className="px-4 py-4 font-mono text-text-muted">{item.variant_sku}</td>
                      <td className="px-4 py-4 text-right text-text-secondary">{item.quantity}</td>
                      <td className="px-4 py-4 text-right text-text-secondary">{formatCurrency(item.unit_price)}</td>
                      <td className="px-6 py-4 text-right font-semibold text-text-primary">{formatCurrency(item.total_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Status history */}
          {order.status_history?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Status History</CardTitle>
              </CardHeader>
              <div className="mt-4 space-y-3">
                {order.status_history.map((entry, i) => {
                  const cfg = orderStatusBadge(entry.status)
                  return (
                    <div key={i} className="flex items-start gap-3">
                      <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={cfg.variant} size="sm">{cfg.label}</Badge>
                          <span className="text-caption text-text-muted">{formatDateTime(entry.timestamp)}</span>
                        </div>
                        {entry.note && <p className="mt-1 text-body-sm text-text-secondary">{entry.note}</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Order summary */}
          <Card>
            <CardTitle>Order Summary</CardTitle>
            <div className="mt-4 space-y-2">
              {[
                { label: 'Subtotal', value: formatCurrency(order.subtotal) },
                { label: 'Discount', value: order.discount_total !== '0.00' ? `-${formatCurrency(order.discount_total)}` : '—' },
                { label: 'Shipping', value: formatCurrency(order.shipping_cost) },
                { label: 'Tax', value: formatCurrency(order.tax_total) },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-body-sm">
                  <span className="text-text-secondary">{label}</span>
                  <span className="text-text-primary">{value}</span>
                </div>
              ))}
              <div className="border-t border-border pt-2">
                <div className="flex justify-between">
                  <span className="font-semibold text-text-primary">Total</span>
                  <span className="text-heading-sm font-bold text-text-primary">{formatCurrency(order.grand_total)}</span>
                </div>
              </div>
              {order.coupon_code_snapshot && (
                <div className="flex justify-between text-body-sm">
                  <span className="text-text-secondary">Coupon</span>
                  <span className="font-mono text-success">{order.coupon_code_snapshot}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Customer */}
          <Card>
            <CardTitle>Customer</CardTitle>
            <div className="mt-3 space-y-1">
              <p className="text-body-sm text-text-primary">{order.user_email ?? '—'}</p>
            </div>
          </Card>

          {/* Shipping address */}
          <Card>
            <CardTitle>Shipping Address</CardTitle>
            <div className="mt-3">
              <AddressBlock snapshot={order.shipping_address_snapshot} />
            </div>
          </Card>

          {/* Status management */}
          <Card>
            <CardTitle>Update Status</CardTitle>
            <div className="mt-4 space-y-3">
              <FormField label="New Status">
                {(id) => (
                  <Select
                    id={id}
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                    className="h-10"
                  >
                    <option value="">Select status…</option>
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </Select>
                )}
              </FormField>
              <FormField label="Note (optional)">
                {(id) => (
                  <Textarea
                    id={id}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Add a note…"
                    rows={2}
                    className="min-h-[72px]"
                  />
                )}
              </FormField>
              <Button
                className="w-full"
                size="sm"
                disabled={!newStatus}
                isLoading={transitionMutation.isPending}
                loadingText="Updating…"
                onClick={() => transitionMutation.mutate()}
              >
                Update Status
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
