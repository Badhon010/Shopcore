import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { PageContainer } from '@/components/layout/PageContainer'
import { Stepper } from '@/components/ui/Stepper'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Spinner } from '@/components/feedback/Spinner'
import { CartSummary } from '@/features/cart/components/CartSummary'
import { CartLineItem } from '@/features/cart/components/CartLineItem'
import { useCheckoutSession, usePlaceOrder } from '@/features/checkout/hooks/useCheckout'
import { useCart } from '@/features/cart/hooks/useCart'
import { buildRoute, ROUTES } from '@/constants/routes'
import { Link } from 'react-router-dom'

const STEPS = [
  { label: 'Shipping' },
  { label: 'Payment' },
  { label: 'Review' },
]

export function PaymentPage() {
  const navigate = useNavigate()
  const { data: session, isLoading } = useCheckoutSession()
  const { data: cart } = useCart()
  const placeOrder = usePlaceOrder()
  const [termsAccepted, setTermsAccepted] = useState(false)

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  const shippingAddress = session?.shipping_address
  const shippingMethod = session?.shipping_method

  const handlePlaceOrder = async () => {
    if (!shippingAddress || !shippingMethod) return
    try {
      const order = await placeOrder.mutateAsync({
        shipping_address: { id: shippingAddress.id },
        billing_address: { id: shippingAddress.id },
        shipping_method_id: shippingMethod.id,
        terms_accepted: termsAccepted,
      })
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
          {/* Left: Payment */}
          <div>
            <h1 className="text-heading-lg font-semibold text-text-primary mb-6">Payment</h1>

            {/* PAYMENT PROVIDER SLOT */}
            {/* 
              CONTRACT-ASSUMPTION: The actual payment provider (Stripe Elements, etc.)
              is determined by the backend. This slot renders a placeholder that documents
              where the payment widget integrates. When the real provider is known:
              1. Install the provider SDK (e.g. @stripe/react-stripe-js)
              2. Mount the provider's hosted element (CardElement, PaymentElement) here
              3. On submit, call provider.confirmPayment() to get a paymentMethodId/token
              4. Pass that token to placeOrder() above via payment_method_id
            */}
            <div className="rounded-xl border-2 border-dashed border-border p-8 text-center">
              <p className="text-body-sm font-medium text-text-secondary">Payment widget integration point</p>
              <p className="mt-1 text-caption text-text-tertiary">
                Replace this placeholder with your payment provider&apos;s hosted element
                (e.g., Stripe Elements, Braintree, etc.)
              </p>
            </div>

            <div className="mt-6 space-y-4">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={setTermsAccepted}
                label={
                  `I agree to the Terms of Service and Privacy Policy`
                }
              />

              <Button
                className="w-full"
                size="lg"
                disabled={!termsAccepted || placeOrder.isPending}
                isLoading={placeOrder.isPending}
                loadingText="Placing order…"
                onClick={handlePlaceOrder}
              >
                Place order
              </Button>
            </div>
          </div>

          {/* Right: Order summary */}
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
