import { formatCurrency } from '@/utils/formatCurrency'
import type { Cart } from '@/types/models'

interface CartSummaryProps {
  cart: Cart
}

export function CartSummary({ cart }: CartSummaryProps) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-bg-subtle p-4">
      <h3 className="text-body-md font-semibold text-text-primary">Order Summary</h3>

      <div className="space-y-2 text-body-sm">
        <div className="flex justify-between">
          <span className="text-text-secondary">
            Subtotal ({cart.item_count} {cart.item_count === 1 ? 'item' : 'items'})
          </span>
          <span className="font-medium text-text-primary">{formatCurrency(cart.subtotal)}</span>
        </div>

        {cart.discount && parseFloat(cart.discount) > 0 && (
          <div className="flex justify-between">
            <span className="text-text-secondary">
              Discount {cart.coupon && <span className="text-success">({cart.coupon.code})</span>}
            </span>
            <span className="font-medium text-success">-{formatCurrency(cart.discount)}</span>
          </div>
        )}

        {cart.estimated_shipping !== undefined && (
          <div className="flex justify-between">
            <span className="text-text-secondary">Estimated shipping</span>
            <span className="font-medium text-text-primary">
              {parseFloat(cart.estimated_shipping) === 0
                ? 'Free'
                : formatCurrency(cart.estimated_shipping)}
            </span>
          </div>
        )}

        {cart.estimated_tax && (
          <div className="flex justify-between">
            <span className="text-text-secondary">Estimated tax</span>
            <span className="font-medium text-text-primary">{formatCurrency(cart.estimated_tax)}</span>
          </div>
        )}
      </div>

      <div className="flex justify-between border-t border-border pt-3">
        <span className="text-body-md font-semibold text-text-primary">Total</span>
        <span className="text-body-md font-bold text-text-primary">{formatCurrency(cart.total)}</span>
      </div>
    </div>
  )
}
