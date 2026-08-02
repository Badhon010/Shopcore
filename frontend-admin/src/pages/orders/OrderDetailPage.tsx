import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Clock, RotateCcw } from 'lucide-react'
import { ordersService } from '@/services/api/orders.service'
import { Card, CardTitle, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { FormField } from '@/components/ui/FormField'
import { Modal } from '@/components/ui/Modal'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Skeleton } from '@/components/feedback/Skeleton'
import { ErrorState } from '@/components/feedback/ErrorState'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatDateTime } from '@/utils/format'
import { ROUTES } from '@/constants/routes'
import { useState } from 'react'
import type { ApiError } from '@/types/api'

// Mirrors apps/orders/constants.py ALLOWED_TRANSITIONS. Note: paid orders
// (PAID/PROCESSING/DELIVERED) can only terminate via REFUNDED — cancelling
// is reserved for unpaid (PENDING_PAYMENT) orders (audit C-1).
const TRANSITIONS: Record<string, string[]> = {
  PENDING_PAYMENT: ['PAID', 'CANCELLED'],
  PAID: ['PROCESSING', 'REFUNDED'],
  PROCESSING: ['SHIPPED', 'REFUNDED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
}

const STATUS_VARIANT = {
  DELIVERED: 'success', SHIPPED: 'info', PROCESSING: 'info',
  PAID: 'success', PENDING_PAYMENT: 'warning', CANCELLED: 'danger', REFUNDED: 'default',
} as const

/** Format variant attributes snapshot like "Size: M · Colour: Red" */
function formatVariantAttributes(attrs?: Record<string, string> | null): string | null {
  if (!attrs || Object.keys(attrs).length === 0) return null
  return Object.entries(attrs).map(([k, v]) => `${k}: ${v}`).join(' · ')
}

export function OrderDetailPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const qc = useQueryClient()
  const [nextStatus, setNextStatus] = useState('')

  const { isAuthenticated } = useAuth()

  const { data: order, isLoading, isError, refetch } = useQuery({
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
    onError: (err) => {
      const apiErr = err as unknown as ApiError
      toast({ title: 'Failed to update status', description: apiErr.message, variant: 'destructive' })
    },
  })

  const cancelMutation = useMutation({
    mutationFn: () => ordersService.cancelOrder(orderNumber!),
    onSuccess: () => {
      toast({ title: 'Order cancelled', variant: 'success' })
      void qc.invalidateQueries({ queryKey: ['admin-order', orderNumber] })
      void qc.invalidateQueries({ queryKey: ['admin-orders'] })
    },
    onError: (err) => {
      const apiErr = err as unknown as ApiError
      toast({ title: 'Failed to cancel order', description: apiErr.message, variant: 'destructive' })
    },
  })

  // Refund (audit C-2) — full-refund only; the backend rejects partials.
  const [refundOpen, setRefundOpen] = useState(false)
  const [refundReason, setRefundReason] = useState('')
  const refundMutation = useMutation({
    mutationFn: () => ordersService.refundOrder(orderNumber!, { reason: refundReason || undefined }),
    onSuccess: () => {
      toast({ title: 'Order refunded — inventory restocked', variant: 'success' })
      void qc.invalidateQueries({ queryKey: ['admin-order', orderNumber] })
      void qc.invalidateQueries({ queryKey: ['admin-orders'] })
      setRefundOpen(false)
      setRefundReason('')
    },
    onError: (err) => {
      const apiErr = err as unknown as ApiError
      toast({ title: 'Refund failed', description: apiErr.message, variant: 'destructive' })
    },
  })

  // Refundable from PAID / PROCESSING / DELIVERED — SHIPPED must be
  // delivered first (ALLOWED_TRANSITIONS: SHIPPED only reaches DELIVERED).
  const isPaid = ['PAID', 'PROCESSING', 'DELIVERED'].includes(order?.status ?? '')

  if (isLoading) return (
    <div className="space-y-5">
      <Skeleton className="h-6 w-64" />
      <Skeleton className="h-48 w-full" />
    </div>
  )

  if (isError || !order) {
    return (
      <ErrorState
        title="Order not found"
        description="This order could not be loaded. It may have been deleted or you may not have access to it."
        onRetry={() => void refetch()}
      />
    )
  }

  const allowedTransitions = TRANSITIONS[order.status] ?? []
  const addr = order.shipping_address_snapshot

  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: 'Orders', href: ROUTES.ORDERS }, { label: `#${order.order_number}` }]} />
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-md" onClick={() => navigate(-1)} aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold text-text-primary">Order #{order.order_number}</h1>
          <Badge variant={STATUS_VARIANT[order.status] ?? 'default'}>
            {order.status}
          </Badge>
        </div>
        {/* Cancel shortcut — only for unpaid orders */}
        {order.can_cancel && (
          <Button
            variant="secondary"
            size="sm"
            isLoading={cancelMutation.isPending}
            onClick={() => cancelMutation.mutate()}
            className="text-danger border-danger/30 hover:bg-danger-subtle"
          >
            Cancel order
          </Button>
        )}
        {/* Refund shortcut — paid orders only; uses the C-2 refund flow */}
        {isPaid && order.status !== 'REFUNDED' && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setRefundOpen(true)}
            className="text-success border-success/30 hover:bg-success-subtle"
          >
            <RotateCcw className="h-4 w-4" />
            Refund
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Order items */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle>Items</CardTitle></CardHeader>
            <div className="space-y-3">
              {order.items?.map((item, i) => (
                <div key={item.id ?? i} className="flex items-start gap-3 border-b border-border-light pb-3 last:border-0 last:pb-0">
                  {/* thumbnail */}
                  {item.image_url && (
                    <img src={item.image_url} alt={item.product_name_snapshot} className="h-12 w-12 rounded-lg object-cover border border-border flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary">{item.product_name_snapshot}</p>
                    {formatVariantAttributes(item.variant_attributes_snapshot) && (
                      <p className="text-xs text-text-muted">{formatVariantAttributes(item.variant_attributes_snapshot)}</p>
                    )}
                    <p className="text-xs text-text-muted">Unit price: {formatCurrency(item.unit_price_snapshot)}</p>
                  </div>
                  <p className="text-sm text-text-secondary flex-shrink-0">×{item.quantity}</p>
                  <p className="text-sm font-medium text-text-primary flex-shrink-0">{formatCurrency(item.line_total)}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t border-border pt-4 space-y-1.5">
              <div className="flex justify-between text-sm text-text-secondary">
                <span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span>
              </div>
              {order.shipping_cost && (
                <div className="flex justify-between text-sm text-text-secondary">
                  <span>Shipping</span><span>{formatCurrency(order.shipping_cost)}</span>
                </div>
              )}
              {order.tax_total && Number(order.tax_total) > 0 && (
                <div className="flex justify-between text-sm text-text-secondary">
                  <span>Tax</span><span>{formatCurrency(order.tax_total)}</span>
                </div>
              )}
              {order.discount_total && Number(order.discount_total) > 0 && (
                <div className="flex justify-between text-sm text-success">
                  <span>Discount{order.coupon_code_snapshot ? ` (${order.coupon_code_snapshot})` : ''}</span>
                  <span>−{formatCurrency(order.discount_total)}</span>
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

          {/* Status history */}
          {order.status_history && order.status_history.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Status History</CardTitle></CardHeader>
              <ol className="space-y-3">
                {order.status_history.map((entry) => (
                  <li key={entry.id} className="flex items-start gap-3 text-sm">
                    <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-light">
                      <Clock className="h-3 w-3 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-text-primary">
                        {entry.from_status
                          ? <><span className="font-medium">{entry.from_status}</span> → <span className="font-medium">{entry.to_status}</span></>
                          : <span className="font-medium">{entry.to_status}</span>
                        }
                        {entry.changed_by_email && (
                          <span className="ml-1.5 text-text-muted">by {entry.changed_by_email}</span>
                        )}
                      </p>
                      {entry.note && <p className="mt-0.5 text-xs text-text-muted">{entry.note}</p>}
                    </div>
                    <span className="shrink-0 text-xs text-text-muted">{formatDateTime(entry.created_at)}</span>
                  </li>
                ))}
              </ol>
            </Card>
          )}
        </div>

        {/* Sidebar: customer, shipping, payment */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Customer</CardTitle></CardHeader>
            <div className="space-y-1.5 text-sm">
              <p className="font-medium text-text-primary">
                {order.user_full_name || order.user?.full_name || order.user_email || '—'}
              </p>
              <p className="text-text-secondary">{order.user_email ?? order.user?.email ?? '—'}</p>
            </div>
          </Card>

          <Card>
            <CardHeader><CardTitle>Shipping address</CardTitle></CardHeader>
            {addr ? (
              <address className="not-italic space-y-0.5 text-sm text-text-secondary">
                <p>{addr.full_name}</p>
                <p>{addr.address_line_1}</p>
                {addr.address_line_2 && <p>{addr.address_line_2}</p>}
                <p>{addr.city}, {addr.state_province} {addr.postal_code}</p>
                <p>{addr.country}</p>
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
                <Badge
                  variant={
                    order.payment_status === 'PAID' ? 'success'
                    : order.payment_status === 'REFUNDED' ? 'default'
                    : order.payment_status === 'FAILED' ? 'danger'
                    : 'warning'
                  }
                >
                  {order.payment_status}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Placed</span>
                <span className="text-text-secondary">{formatDateTime(order.placed_at ?? order.created_at)}</span>
              </div>
              {order.notes && (
                <div className="mt-2 rounded-lg bg-background-subtle p-2.5 text-xs text-text-secondary">
                  <p className="font-medium text-text-muted mb-0.5">Notes</p>
                  {order.notes}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Refund modal — full refund only (backend rejects partials) */}
      <Modal
        open={refundOpen}
        onClose={() => setRefundOpen(false)}
        title={`Refund order #${order.order_number}`}
        description="This will refund the full order total, mark the payment refunded, and restock inventory."
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-background-subtle p-3 text-sm">
            <div className="flex justify-between text-text-secondary">
              <span>Refund amount</span>
              <span className="font-semibold text-text-primary">{formatCurrency(order.grand_total)}</span>
            </div>
          </div>
          <FormField label="Reason (optional)" htmlFor="refund-reason">
            <Input
              id="refund-reason"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="e.g. Customer request / damaged item"
            />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setRefundOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              isLoading={refundMutation.isPending}
              onClick={() => refundMutation.mutate()}
            >
              <RotateCcw className="h-4 w-4" /> Refund full amount
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
