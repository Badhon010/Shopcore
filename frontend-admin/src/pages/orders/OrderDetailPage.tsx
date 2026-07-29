import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { ordersService } from '@/services/api/orders.service'
import { Card, CardTitle, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Skeleton } from '@/components/feedback/Skeleton'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatDateTime } from '@/utils/format'
import { ROUTES } from '@/constants/routes'
import { useState } from 'react'

const TRANSITIONS: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: ['REFUNDED'],
}

const STATUS_VARIANT = {
  DELIVERED: 'success', SHIPPED: 'info', PROCESSING: 'info',
  CONFIRMED: 'info', PENDING: 'warning', CANCELLED: 'danger', REFUNDED: 'default',
} as const

export function OrderDetailPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const qc = useQueryClient()
  const [nextStatus, setNextStatus] = useState('')

  const { isAuthenticated } = useAuth()

  const { data: order, isLoading } = useQuery({
    queryKey: ['admin-order', orderNumber],
    queryFn: () => ordersService.getOrder(orderNumber!),
    enabled: isAuthenticated && !!orderNumber,
  })

  const transitionMutation = useMutation({
    mutationFn: (status: string) => ordersService.transitionOrder(orderNumber!, status),
    onSuccess: () => {
      toast({ title: 'Order status updated', variant: 'success' })
      void qc.invalidateQueries({ queryKey: ['admin-order', orderNumber] })
      void qc.invalidateQueries({ queryKey: ['admin-orders'] })
      setNextStatus('')
    },
    onError: () => toast({ title: 'Failed to update order status', variant: 'destructive' }),
  })

  if (isLoading) return (
    <div className="space-y-5">
      <Skeleton className="h-6 w-64" />
      <Skeleton className="h-48 w-full" />
    </div>
  )

  if (!order) return null

  const allowedTransitions = TRANSITIONS[order.status] ?? []

  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: 'Orders', href: ROUTES.ORDERS }, { label: `#${order.order_number}` }]} />
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-md" onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-lg font-semibold text-text-primary">Order #{order.order_number}</h1>
        <Badge variant={STATUS_VARIANT[order.status as keyof typeof STATUS_VARIANT] ?? 'default'}>
          {order.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Order items */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle>Items</CardTitle></CardHeader>
            <div className="space-y-3">
              {order.items?.map((item, i) => (
                <div key={i} className="flex items-center gap-3 border-b border-border-light pb-3 last:border-0 last:pb-0">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text-primary">{item.product_name}</p>
                    {item.variant_sku && <p className="text-xs text-text-muted font-mono">{item.variant_sku}</p>}
                  </div>
                  <p className="text-sm text-text-secondary">×{item.quantity}</p>
                  <p className="text-sm font-medium text-text-primary">{formatCurrency(item.total_price)}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t border-border pt-4 space-y-1.5">
              <div className="flex justify-between text-sm text-text-secondary">
                <span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-text-secondary">
                <span>Shipping</span><span>{formatCurrency(order.shipping_cost)}</span>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-sm text-success">
                  <span>Discount</span><span>-{formatCurrency(order.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-semibold text-text-primary border-t border-border pt-2">
                <span>Total</span><span>{formatCurrency(order.grand_total)}</span>
              </div>
            </div>
          </Card>

          {/* Status transition */}
          {allowedTransitions.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Update Status</CardTitle></CardHeader>
              <div className="flex items-center gap-3">
                <Select value={nextStatus} onChange={(e) => setNextStatus(e.target.value)} className="flex-1">
                  <option value="">Select new status…</option>
                  {allowedTransitions.map((s) => <option key={s} value={s}>{s}</option>)}
                </Select>
                <Button isLoading={transitionMutation.isPending} disabled={!nextStatus} onClick={() => transitionMutation.mutate(nextStatus)}>
                  Update
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar: customer, shipping, payment */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Customer</CardTitle></CardHeader>
            <div className="space-y-1.5 text-sm">
              <p className="font-medium text-text-primary">{order.user?.full_name ?? '—'}</p>
              <p className="text-text-secondary">{order.user?.email ?? '—'}</p>
            </div>
          </Card>

          <Card>
            <CardHeader><CardTitle>Shipping address</CardTitle></CardHeader>
            {order.shipping_address ? (
              <address className="not-italic space-y-0.5 text-sm text-text-secondary">
                <p>{order.shipping_address.full_name}</p>
                <p>{order.shipping_address.address_line1}</p>
                {order.shipping_address.address_line2 && <p>{order.shipping_address.address_line2}</p>}
                <p>{order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}</p>
                <p>{order.shipping_address.country}</p>
              </address>
            ) : (
              <p className="text-sm text-text-muted">No address on file</p>
            )}
          </Card>

          <Card>
            <CardHeader><CardTitle>Payment</CardTitle></CardHeader>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Status</span>
                <Badge variant={order.payment_status === 'PAID' ? 'success' : 'warning'}>{order.payment_status}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Method</span>
                <span className="text-text-secondary">{order.payment_method ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Placed</span>
                <span className="text-text-secondary">{formatDateTime(order.created_at)}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
