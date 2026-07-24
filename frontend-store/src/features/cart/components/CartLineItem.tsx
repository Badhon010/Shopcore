import { Minus, Plus, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/utils/cn'
import { formatCurrency } from '@/utils/formatCurrency'
import { IconButton } from '@/components/ui/IconButton'
import { buildRoute } from '@/constants/routes'
import { useUpdateCartItem, useRemoveCartItem } from '../hooks/useCart'
import type { CartItem } from '@/types/models'

interface CartLineItemProps {
  item: CartItem
  compact?: boolean
}

export function CartLineItem({ item, compact = false }: CartLineItemProps) {
  const updateItem = useUpdateCartItem()
  const removeItem = useRemoveCartItem()

  const isUpdating = updateItem.isPending
  const isRemoving = removeItem.isPending

  return (
    <div className={cn('flex gap-3', compact ? 'py-2' : 'py-4')}>
      <Link
        to={buildRoute.product(item.product.slug)}
        className="shrink-0"
        aria-label={item.product.name}
      >
        <div className={cn('overflow-hidden rounded-lg border border-border bg-bg-subtle', compact ? 'h-14 w-14' : 'h-20 w-20')}>
          <img
            src={item.product.images[0]?.url ?? '/placeholder-product.svg'}
            alt={item.product.images[0]?.alt ?? item.product.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      </Link>

      <div className="flex flex-1 flex-col justify-between min-w-0">
        <div>
          <Link
            to={buildRoute.product(item.product.slug)}
            className="block truncate text-body-sm font-medium text-text-primary hover:text-accent transition-colors"
          >
            {item.product.name}
          </Link>
          {item.variant && (
            <p className="mt-0.5 text-caption text-text-tertiary">
              {item.variant.options.map((o) => o.value).join(' / ')}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between">
          {!compact && (
            <div className="flex items-center gap-1 rounded-md border border-border">
              <IconButton
                label="Decrease quantity"
                size="sm"
                onClick={() =>
                  updateItem.mutate({ itemId: item.id, payload: { quantity: Math.max(1, item.quantity - 1) } })
                }
                disabled={item.quantity <= 1 || isUpdating}
              >
                <Minus className="h-3 w-3" />
              </IconButton>
              <span
                className="min-w-[1.5rem] text-center text-body-sm font-medium"
                aria-live="polite"
                aria-label={`Quantity: ${item.quantity}`}
              >
                {item.quantity}
              </span>
              <IconButton
                label="Increase quantity"
                size="sm"
                onClick={() =>
                  updateItem.mutate({ itemId: item.id, payload: { quantity: item.quantity + 1 } })
                }
                disabled={isUpdating}
              >
                <Plus className="h-3 w-3" />
              </IconButton>
            </div>
          )}
          {compact && (
            <span className="text-caption text-text-secondary">Qty: {item.quantity}</span>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-body-sm font-semibold text-text-primary">
              {formatCurrency(item.total_price)}
            </span>
            {!compact && (
              <IconButton
                label={`Remove ${item.product.name}`}
                size="sm"
                onClick={() => removeItem.mutate(item.id)}
                disabled={isRemoving}
                className="text-text-tertiary hover:text-danger"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </IconButton>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
