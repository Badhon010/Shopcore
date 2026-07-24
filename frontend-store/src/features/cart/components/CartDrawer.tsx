import { useNavigate } from 'react-router-dom'
import { ShoppingBag } from 'lucide-react'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/feedback/Spinner'
import { EmptyState } from '@/components/feedback/EmptyState'
import { CartLineItem } from './CartLineItem'
import { CartSummary } from './CartSummary'
import { CouponInput } from './CouponInput'
import { useCart } from '../hooks/useCart'
import { ROUTES } from '@/constants/routes'
import { env } from '@/config/env'

interface CartDrawerProps {
  open: boolean
  onClose: () => void
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const navigate = useNavigate()
  const { data: cart, isLoading } = useCart()

  const hasItems = (cart?.item_count ?? 0) > 0
  const hasOutOfStock = cart?.items.some(
    (item) => item.variant ? !item.variant.is_available : !item.product.in_stock
  ) ?? false

  return (
    <Drawer open={open} onClose={onClose} title="Your Cart" side="right">
      <div className="flex h-full flex-col">
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Spinner />
          </div>
        ) : !hasItems ? (
          <EmptyState
            icon={<ShoppingBag className="h-8 w-8" />}
            title="Your cart is empty"
            description="Browse our collection and find something you love."
            action={{
              label: 'Shop now',
              onClick: () => { navigate(ROUTES.PRODUCTS); onClose() },
            }}
            className="flex-1"
          />
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6">
              <div className="divide-y divide-border">
                {cart!.items.map((item) => (
                  <CartLineItem key={item.id} item={item} />
                ))}
              </div>
              {env.VITE_ENABLE_COUPONS && (
                <div className="mt-4">
                  <CouponInput cart={cart!} />
                </div>
              )}
            </div>

            <div className="border-t border-border p-6 space-y-4">
              <CartSummary cart={cart!} />
              {hasOutOfStock && (
                <p role="alert" className="text-caption text-danger">
                  Some items in your cart are out of stock. Please remove them before checking out.
                </p>
              )}
              <Button
                className="w-full"
                size="lg"
                disabled={hasOutOfStock}
                onClick={() => { navigate(ROUTES.CHECKOUT); onClose() }}
              >
                Proceed to checkout
              </Button>
              <Button variant="ghost" className="w-full" onClick={onClose}>
                Continue shopping
              </Button>
            </div>
          </>
        )}
      </div>
    </Drawer>
  )
}
