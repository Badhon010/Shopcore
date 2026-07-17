import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency } from '@/utils/formatCurrency'
import { formatDate } from '@/utils/formatDate'
import { buildRoute } from '@/constants/routes'
import type { Order, OrderStatus } from '@/types/models'

const STATUS_BADGE: Record<OrderStatus, { variant: 'neutral' | 'success' | 'warning' | 'danger' | 'accent'; label: string }> = {
  pending: { variant: 'neutral', label: 'Pending' },
  confirmed: { variant: 'accent', label: 'Confirmed' },
  processing: { variant: 'accent', label: 'Processing' },
  packed: { variant: 'accent', label: 'Packed' },
  shipped: { variant: 'accent', label: 'Shipped' },
  out_for_delivery: { variant: 'warning', label: 'Out for Delivery' },
  delivered: { variant: 'success', label: 'Delivered' },
  cancelled: { variant: 'danger', label: 'Cancelled' },
  returned: { variant: 'neutral', label: 'Returned' },
  refunded: { variant: 'neutral', label: 'Refunded' },
}

interface OrderCardProps {
  order: Order
}

export function OrderCard({ order }: OrderCardProps) {
  const statusConfig = STATUS_BADGE[order.status]
  const previewImages = order.items.slice(0, 3)

  return (
    <Link
      to={buildRoute.orderDetails(order.order_number)}
      className="group flex items-center gap-4 rounded-xl border border-border bg-surface p-4 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:shadow-focus-ring"
    >
      {/* Product images preview */}
      <div className="flex shrink-0 -space-x-2">
        {previewImages.map((item, i) => (
          <div
            key={item.id}
            className="h-12 w-12 overflow-hidden rounded-lg border-2 border-surface"
            style={{ zIndex: previewImages.length - i }}
          >
            <img
              src={item.product.images[0]?.url ?? '/placeholder-product.svg'}
              alt={item.product.name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        ))}
        {order.items.length > 3 && (
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-surface bg-bg-subtle text-caption text-text-tertiary">
            +{order.items.length - 3}
          </div>
        )}
      </div>

      {/* Order info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-body-sm font-semibold text-text-primary">#{order.order_number}</p>
          <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
        </div>
        <p className="mt-0.5 text-caption text-text-tertiary">
          {formatDate(order.created_at, { month: 'short', day: 'numeric', year: 'numeric' })} ·{' '}
          {order.items.length} {order.items.length === 1 ? 'item' : 'items'} ·{' '}
          <span className="font-medium text-text-primary">{formatCurrency(order.total)}</span>
        </p>
      </div>

      <ChevronRight className="h-4 w-4 shrink-0 text-text-tertiary transition-transform group-hover:translate-x-0.5" />
    </Link>
  )
}
