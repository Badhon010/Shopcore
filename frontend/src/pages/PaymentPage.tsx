import { useState } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { PageContainer } from '@/components/layout/PageContainer'
import { Stepper } from '@/components/ui/Stepper'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Spinner } from '@/components/feedback/Spinner'
import { CartSummary } from '@/features/cart/components/CartSummary'
import { CartLineItem } from '@/features/cart/components/CartLineItem'
import { usePlaceOrder, useInitiatePayment } from '@/features/checkout/hooks/useCheckout'
import { useCart } from '@/features/cart/hooks/useCart'
import { useAddresses } from '@/features/account/hooks/useProfile'
import { buildRoute, ROUTES } from '@/constants/routes'

const STEPS = [
  { label: 'Shipping' },
  { label: 'Payment' },
  { label: 'Review' },
]

/**
 * Step 2 of checkout — review order and place it.
 *
 * Expects `location.state.shippingAddressId` to be set by CheckoutPage.
 * If the user lands here directly (no state), they are redirected back to
 * the shipping step.
 *
 * Flow:
 *   1. POST /orders/checkout/   → creates the order, returns order_number
 *   2. POST /payments/initiate/ → triggers MANUAL payment (immediate)
 *   3. Navigate to success page
 */
export function PaymentPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const shippingAddressId: string | undefined = location.state?.shippingAddressId

  const { data: cart, isLoading: cartLoading } = useCart()
  const { data: addresses, isLoading: addressesLoading } = useAddresses()
  const placeOrder = usePlaceOrder()
  const initiatePayment = useInitiatePayment()
  const [termsAccepted, setTermsAccepted] = useState(false)

  // Guard: address must have been chosen on the previous step
  if (!shippingAddressId) {
    return <Navigate to={ROUTES.CHECKOUT} replace />
  }

  if (cartLoading || addressesLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  const shippingAddress = addresses?.find((a) => a.id === shippingAddressId)
  const isPending = placeOrder.isPending || initiatePayment.isPending

  const handlePlaceOrder = async () => {
    if (!termsAccepted) return
    try {
      const addressIdInt = parseInt(shippingAddressId, 10)
      const order = await placeOrder.mutateAsync({
        shipping_address_id: addressIdInt,
        billing_address_id: addressIdInt,
      })
      await initiatePayment.mutateAsync({ order_number: order.order_number })
      navigate(buildRoute.orderSuccess(order.order_number))
    } catch {
      navigate(ROUTES.CHECKOUT_FAILURE)
    }
  }

  return (
    <>
      <Helmet>
        <title>Payment — ShopCore</title>
      </Helmet>
      <PageContainer className="py-8">
        <Stepper steps={STEPS} currentStep={1} className="mb-10 max-w-xl mx-auto" />

        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Left column: shipping summary + payment confirmation */}
          <div>
            <h1 className="text-heading-lg font-semibold text-text-primary mb-6">Review &amp; pay</h1>

            {/* Shipping address summary */}
            {shippingAddress && (
              <div className="mb-4 rounded-xl border border-border p-4">
                <p className="text-caption font-medium text-text-secondary uppercase tracking-wide mb-2">
                  Shipping to
                </p>
                <p className="text-body-sm font-medium text-text-primary">{shippingAddress.full_name}</p>
                <p className="text-body-sm text-text-secondary">
                  {shippingAddress.address_line_1}
                  {shippingAddress.address_line_2 ? `, ${shippingAddress.address_line_2}` : ''}
                </p>
                <p className="text-body-sm text-text-secondary">
                  {shippingAddress.city}, {shippingAddress.state_province} {shippingAddress.postal_code}
                </p>
                <p className="text-body-sm text-text-secondary">{shippingAddress.country}</p>
              </div>
            )}

            {/* Payment method */}
            <div className="mb-6 rounded-xl border border-border p-4">
              <p className="text-caption font-medium text-text-secondary uppercase tracking-wide mb-2">
                Payment method
              </p>
              <p className="text-body-sm text-text-primary">Cash on delivery</p>
              <p className="text-caption text-text-tertiary mt-0.5">
                Payment is collected upon delivery.
              </p>
            </div>

            <div className="space-y-4">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={setTermsAccepted}
                label="I agree to the Terms of Service and Privacy Policy"
              />
              <Button
                className="w-full"
                size="lg"
                disabled={!termsAccepted || isPending}
                isLoading={isPending}
                loadingText="Placing order…"
                onClick={handlePlaceOrder}
              >
                Place order
              </Button>
            </div>
          </div>

          {/* Right column: order summary */}
          <div>
            <h2 className="text-heading-sm font-semibold text-text-primary mb-4">Order summary</h2>
            {cart && (
              <>
                <div className="divide-y divide-border rounded-xl border border-border mb-4">
                  {cart.items.map((item) => (
                    <div key={item.id} className="px-4">
                      <CartLineItem item={item} compact />
                    </div>
                  ))}
                </div>
                <CartSummary cart={cart} />
              </>
            )}
          </div>
        </div>
      </PageContainer>
    </>
  )
}
