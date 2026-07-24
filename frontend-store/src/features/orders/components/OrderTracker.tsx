import { Check } from 'lucide-react'
import { cn } from '@/utils/cn'
import { formatDate } from '@/utils/formatDate'
import type { Order, OrderStatus } from '@/types/models'

// Steps that represent the happy-path progression — matches backend OrderStatus values.
const STATUS_STEPS: OrderStatus[] = [
  'PENDING_PAYMENT',
  'PAID',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
]

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'Order Placed',
  PAID: 'Payment Confirmed',
  PROCESSING: 'Processing',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
}

interface OrderTrackerProps {
  order: Order
}

export function OrderTracker({ order }: OrderTrackerProps) {
  if (order.status === 'CANCELLED' || order.status === 'REFUNDED') {
    // Find the history entry that transitioned INTO this terminal status
    const terminalEntry = order.status_history.find((h) => h.to_status === order.status)
    return (
      <div className="rounded-lg bg-danger-subtle border border-danger/20 p-4">
        <p className="text-body-sm font-semibold text-danger">
          Order {STATUS_LABELS[order.status]}
        </p>
        {terminalEntry?.note && (
          <p className="mt-1 text-body-sm text-text-secondary">{terminalEntry.note}</p>
        )}
      </div>
    )
  }

  const currentStepIndex = STATUS_STEPS.indexOf(order.status)

  // Unknown / future status not in the happy-path list — show a plain notice
  if (currentStepIndex === -1) {
    return (
      <div className="rounded-lg bg-secondary border border-border p-4">
        <p className="text-body-sm font-semibold text-text-primary capitalize">
          {STATUS_LABELS[order.status as keyof typeof STATUS_LABELS]
            ?? order.status.replace(/_/g, ' ').toLowerCase()}
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <nav aria-label="Order status" className="min-w-[500px]">
        <ol className="flex items-start justify-between">
          {STATUS_STEPS.map((step, index) => {
            const isCompleted = index < currentStepIndex
            const isCurrent = index === currentStepIndex
            // Find history entry where the order transitioned INTO this step
            const historyEntry = order.status_history.find((h) => h.to_status === step)

            return (
              <li
                key={step}
                className={cn(
                  'flex flex-1 flex-col items-center relative'
                )}
              >
                {/* Connector line */}
                {index > 0 && (
                  <div
                    className={cn(
                      'absolute left-0 top-4 h-0.5 w-full -translate-x-1/2',
                      isCompleted || isCurrent ? 'bg-primary' : 'bg-border'
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
                      ? 'border-primary bg-primary text-text-inverse'
                      : isCurrent
                        ? 'border-primary bg-surface'
                        : 'border-border bg-surface'
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" aria-hidden />
                  ) : isCurrent ? (
                    <div className="h-2 w-2 rounded-full bg-primary" aria-hidden />
                  ) : null}
                </div>

                {/* Label */}
                <div className="mt-2 text-center">
                  <p
                    className={cn(
                      'text-caption font-medium',
                      isCurrent ? 'text-primary' : isCompleted ? 'text-text-secondary' : 'text-text-tertiary'
                    )}
                  >
                    {STATUS_LABELS[step]}
                  </p>
                  {historyEntry && (
                    <p className="text-caption text-text-tertiary">
                      {formatDate(historyEntry.created_at, { month: 'short', day: 'numeric' })}
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
