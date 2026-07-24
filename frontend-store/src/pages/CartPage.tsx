import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ShoppingBag } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/Button'
import { CartLineItem } from '@/features/cart/components/CartLineItem'
import { CartSummary } from '@/features/cart/components/CartSummary'
import { CouponInput } from '@/features/cart/components/CouponInput'
import { Spinner } from '@/components/feedback/Spinner'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { useCart } from '@/features/cart/hooks/useCart'
import { ROUTES } from '@/constants/routes'
import { env } from '@/config/env'

export function CartPage() {
  const { data: cart, isLoading, error, refetch } = useCart()

  const hasItems = (cart?.item_count ?? 0) > 0
  const hasOutOfStock = cart?.items.some(
    (item) => item.variant ? !item.variant.is_available : !item.product.in_stock
  ) ?? false

  return (
    <>
      <Helmet>
        <title>Your Cart — ShopCore</title>
      </Helmet>
      <PageContainer className="py-8">
        <h1 className="text-heading-xl font-semibold text-text-primary">Your Cart</h1>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <ErrorState onRetry={refetch} className="py-16" />
        ) : !hasItems ? (
          <EmptyState
            icon={<ShoppingBag className="h-8 w-8" />}
            title="Your cart is empty"
            description="Browse our collection and find something you love."
            action={{ label: 'Shop now', onClick: () => {} }}
            className="py-16"
          />
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="divide-y divide-border rounded-xl border border-border bg-surface">
                {cart!.items.map((item) => (
                  <div key={item.id} className="px-6">
                    <CartLineItem item={item} />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {env.VITE_ENABLE_COUPONS && <CouponInput cart={cart!} />}
              <CartSummary cart={cart!} />
              {hasOutOfStock && (
                <p role="alert" className="text-caption text-danger">
                  Some items in your cart are out of stock. Please remove them before checking out.
                </p>
              )}
              <Button size="lg" className="w-full" disabled={hasOutOfStock} asChild={!hasOutOfStock}>
                {hasOutOfStock ? (
                  'Proceed to checkout'
                ) : (
                  <Link to={ROUTES.CHECKOUT}>Proceed to checkout</Link>
                )}
              </Button>
              <Button variant="ghost" size="md" className="w-full" asChild>
                <Link to={ROUTES.PRODUCTS}>Continue shopping</Link>
              </Button>
            </div>
          </div>
        )}
      </PageContainer>
    </>
  )
}
