import { Check } from 'lucide-react'
import { cn } from '@/utils/cn'
import { formatDate } from '@/utils/formatDate'
import type { Order, OrderStatus } from '@/types/models'

const STATUS_STEPS: OrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'packed',
  'shipped',
  'out_for_delivery',
  'delivered',
]

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Order Placed',
  confirmed: 'Confirmed',
  processing: 'Processing',
  packed: 'Packed',
  shipped: 'Shipped',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  returned: 'Returned',
  refunded: 'Refunded',
}

interface OrderTrackerProps {
  order: Order
}

export function OrderTracker({ order }: OrderTrackerProps) {
  if (order.status === 'cancelled' || order.status === 'returned' || order.status === 'refunded') {
    return (
      <div className="rounded-lg bg-danger-subtle border border-danger/20 p-4">
        <p className="text-body-sm font-semibold text-danger">
          Order {STATUS_LABELS[order.status]}
        </p>
        {order.status_history.find((h) => h.status === order.status)?.note && (
          <p className="mt-1 text-body-sm text-text-secondary">
            {order.status_history.find((h) => h.status === order.status)?.note}
          </p>
        )}
      </div>
    )
  }

  const currentStepIndex = STATUS_STEPS.indexOf(order.status)

  return (
    <div className="overflow-x-auto">
      <nav aria-label="Order status" className="min-w-[600px]">
        <ol className="flex items-start justify-between">
          {STATUS_STEPS.map((step, index) => {
            const isCompleted = index < currentStepIndex
            const isCurrent = index === currentStepIndex
            const historyEntry = order.status_history.find((h) => h.status === step)

            return (
              <li
                key={step}
                className={cn(
                  'flex flex-1 flex-col items-center',
                  index < STATUS_STEPS.length - 1 && 'relative'
                )}
              >
                {/* Connector line */}
                {index > 0 && (
                  <div
                    className={cn(
                      'absolute left-0 top-4 h-0.5 w-full -translate-x-1/2',
                      isCompleted || isCurrent ? 'bg-accent' : 'bg-border'
                    )}
                    aria-hidden
                  />
                )}

                {/* Status dot */}
                <div
                  aria-current={isCurrent ? 'step' : undefined}
                  className={cn(
                    'relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors',
                    isCompleted
                      ? 'border-accent bg-accent text-text-inverse'
                      : isCurrent
                        ? 'border-accent bg-surface'
                        : 'border-border bg-surface'
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" aria-hidden />
                  ) : isCurrent ? (
                    <div className="h-2 w-2 rounded-full bg-accent" aria-hidden />
                  ) : null}
                </div>

                {/* Label */}
                <div className="mt-2 text-center">
                  <p
                    className={cn(
                      'text-caption font-medium',
                      isCurrent ? 'text-accent' : isCompleted ? 'text-text-secondary' : 'text-text-tertiary'
                    )}
                  >
                    {STATUS_LABELS[step]}
                  </p>
                  {historyEntry && (
                    <p className="text-caption text-text-tertiary">
                      {formatDate(historyEntry.timestamp, { month: 'short', day: 'numeric' })}
                    </p>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      </nav>
    </div>
  )
}
