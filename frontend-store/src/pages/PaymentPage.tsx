import { useEffect, useState } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { QrCode, Landmark, Building2, Smartphone, ShieldCheck } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Stepper } from '@/components/ui/Stepper'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/feedback/Spinner'
import { CartSummary } from '@/features/cart/components/CartSummary'
import { CartLineItem } from '@/features/cart/components/CartLineItem'
import {
  usePlaceOrder,
  usePlaceGuestOrder,
  useInitiatePayment,
  usePaymentMethods,
  useSubmitManualPayment,
} from '@/features/checkout/hooks/useCheckout'
import { useCart } from '@/features/cart/hooks/useCart'
import { useAddresses } from '@/features/account/hooks/useProfile'
import { useAuth } from '@/contexts/AuthContext'
import { guestOrderStore } from '@/utils/guestOrderStore'
import { buildRoute, ROUTES } from '@/constants/routes'
import type { GuestPlaceOrderPayload } from '@/services/api/checkout.service'
import type { PaymentMethod, PaymentProvider, ManualPaymentProvider } from '@/types/models'

const STEPS = [
  { label: 'Shipping' },
  { label: 'Payment' },
  { label: 'Review' },
]

const MANUAL_PROVIDERS: ManualPaymentProvider[] = ['BANK_TRANSFER', 'BKASH', 'NAGAD', 'ROCKET']
const GATEWAY_PROVIDERS: PaymentProvider[] = ['SSLCOMMERZ', 'STRIPE', 'PAYPAL']

function methodIcon(provider: PaymentProvider) {
  switch (provider) {
    case 'BANK_TRANSFER': return <Landmark className="h-5 w-5" />
    case 'BKASH':
    case 'NAGAD':
    case 'ROCKET': return <Smartphone className="h-5 w-5" />
    case 'MANUAL': return <ShieldCheck className="h-5 w-5" />
    default: return <Building2 className="h-5 w-5" />
  }
}

/**
 * Step 2 of checkout — choose a payment method, place the order, and handle
 * the selected method's flow:
 *
 *   MANUAL (COD)            → place → initiate (immediate) → success
 *   BANK_TRANSFER/BKASH/…   → place → submit reference + receipt → success (pending review)
 *   SSLCOMMERZ/STRIPE/PAYPAL → place → initiate → redirect to gateway (or client_secret)
 *
 * Registered users arrive with `location.state.shippingAddressId`; guests
 * (audit H-4) arrive with `location.state.guest` (GuestPlaceOrderPayload).
 */
interface PaymentPageState {
  shippingAddressId?: string
  guest?: GuestPlaceOrderPayload
}

export function PaymentPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated } = useAuth()
  const state = (location.state ?? {}) as PaymentPageState
  const shippingAddressId: string | undefined = state.shippingAddressId
  const guestPayload: GuestPlaceOrderPayload | undefined = state.guest

  const { data: cart, isLoading: cartLoading } = useCart()
  const { data: addresses, isLoading: addressesLoading } = useAddresses()
  const { data: methods = [], isLoading: methodsLoading } = usePaymentMethods()
  const placeOrder = usePlaceOrder()
  const placeGuestOrder = usePlaceGuestOrder()
  const initiatePayment = useInitiatePayment()
  const submitManual = useSubmitManualPayment()

  const [selectedMethodId, setSelectedMethodId] = useState<number | null>(null)
  const [termsAccepted, setTermsAccepted] = useState(false)
  // Manual-submission step state (after a manual-method order is placed)
  const [placedOrderNumber, setPlacedOrderNumber] = useState<string | null>(null)
  const [referenceNumber, setReferenceNumber] = useState('')
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [paymentNotes, setPaymentNotes] = useState('')
  const [submissionError, setSubmissionError] = useState<string | null>(null)

  // Auto-select the first enabled method once they load (usually COD),
  // so a card is visibly selected and the order button is immediately valid.
  // NOTE: must stay ABOVE the early-return guard (Rules of Hooks).
  useEffect(() => {
    if (selectedMethodId === null && methods.length > 0) {
      const firstMethod = methods[0]
      if (firstMethod) {
        setSelectedMethodId(Number(firstMethod.id))
      }
    }
  }, [methods, selectedMethodId])

  // Guard: we must have either a registered address or a guest payload
  if (!shippingAddressId && !guestPayload) {
    return <Navigate to={ROUTES.CHECKOUT} replace />
  }

  const loading = cartLoading || addressesLoading || methodsLoading
  // Backend serializes PaymentMethod.id as a JSON number — compare numerically
  // (string vs number === always fails and silently falls back to COD).
  const selectedMethod =
    methods.find((m) => Number(m.id) === selectedMethodId)
    ?? methods.find((m) => m.provider === 'MANUAL')
    ?? null

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  const shippingAddress = addresses?.find((a) => a.id === shippingAddressId)

  const isPending = placeOrder.isPending || placeGuestOrder.isPending || initiatePayment.isPending || submitManual.isPending

  const placeTheOrder = async (): Promise<{ orderNumber: string; guestLookupToken?: string }> => {
    if (!selectedMethod) throw new Error('No payment method selected')
    if (isAuthenticated && shippingAddressId) {
      const addressIdInt = parseInt(shippingAddressId, 10)
      const order = await placeOrder.mutateAsync({
        shipping_address_id: addressIdInt,
        billing_address_id: addressIdInt,
      })
      return { orderNumber: order.order_number }
    }
    if (guestPayload) {
      const order = await placeGuestOrder.mutateAsync(guestPayload)
      if (order.guest_lookup_token) {
        guestOrderStore.save(order.order_number, order.guest_lookup_token)
      }
      return { orderNumber: order.order_number, guestLookupToken: order.guest_lookup_token }
    }
    throw new Error('Checkout requires either a shipping address or guest details')
  }

  const handlePlaceOrder = async () => {
    if (!termsAccepted || !selectedMethod) return
    setSubmissionError(null)
    try {
      const provider = selectedMethod.provider
      const { orderNumber, guestLookupToken } = await placeTheOrder()

      // COD — confirm immediately and go to success
      if (provider === 'MANUAL') {
        await initiatePayment.mutateAsync({ order_number: orderNumber, provider: 'MANUAL' })
        navigate(buildRoute.orderSuccess(orderNumber), { state: { guestLookupToken } })
        return
      }

      // Gateway providers — initiate and hand off to the gateway
      if (GATEWAY_PROVIDERS.includes(provider)) {
        const res = await initiatePayment.mutateAsync({ order_number: orderNumber, provider })
        if (res.redirect_url) {
          window.location.href = res.redirect_url
          return
        }
        // Stripe client_secret path — full card form is out of scope until
        // Stripe credentials are configured (gateway disabled by default).
        if (res.client_secret) {
          navigate(buildRoute.orderSuccess(orderNumber), { state: { guestLookupToken } })
          return
        }
        navigate(buildRoute.orderSuccess(orderNumber), { state: { guestLookupToken } })
        return
      }

      // Manual (offline) providers — move to the submission form
      setPlacedOrderNumber(orderNumber)
    } catch (err) {
      const message = (err as { message?: string })?.message
      setSubmissionError(message ?? 'We could not place your order. Please try again.')
    }
  }

  const handleSubmitManualPayment = async () => {
    if (!placedOrderNumber || !selectedMethod) return
    setSubmissionError(null)
    try {
      await submitManual.mutateAsync({
        order_number: placedOrderNumber,
        method_id: Number(selectedMethod.id),
        reference_number: referenceNumber.trim(),
        receipt: receiptFile ?? undefined,
        notes: paymentNotes.trim() || undefined,
        ...(guestPayload ? { phone_number: guestPayload.guest_phone } : {}),
      })
      navigate(buildRoute.orderSuccess(placedOrderNumber), {
        state: {
          manualPending: true,
          guestLookupToken: guestOrderStore.get(placedOrderNumber),
        },
      })
    } catch (err) {
      const message = (err as { message?: string })?.message
      setSubmissionError(message ?? 'Could not submit your payment details. Please try again.')
    }
  }

  // After the order is placed with a manual method — show the submission step
  if (placedOrderNumber) {
    return (
      <ManualPaymentForm
        orderNumber={placedOrderNumber}
        method={selectedMethod}
        referenceNumber={referenceNumber}
        onReferenceChange={setReferenceNumber}
        receiptFile={receiptFile}
        onReceiptChange={setReceiptFile}
        notes={paymentNotes}
        onNotesChange={setPaymentNotes}
        isSubmitting={submitManual.isPending}
        error={submissionError}
        onSubmit={handleSubmitManualPayment}
        onBack={() => setPlacedOrderNumber(null)}
      />
    )
  }

  return (
    <>
      <Helmet>
        <title>Payment — ShopCore</title>
      </Helmet>
      <PageContainer className="py-8">
        <Stepper steps={STEPS} currentStep={1} className="mb-10 max-w-xl mx-auto" />

        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Left column: shipping summary + payment method selection */}
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
              </div>
            )}
            {guestPayload && (
              <div className="mb-4 rounded-xl border border-border p-4">
                <p className="text-caption font-medium text-text-secondary uppercase tracking-wide mb-2">
                  Shipping to
                </p>
                <p className="text-body-sm font-medium text-text-primary">{guestPayload.guest_name}</p>
                <p className="text-body-sm text-text-secondary">
                  {guestPayload.shipping_address.address_line_1}
                  {guestPayload.shipping_address.address_line_2 ? `, ${guestPayload.shipping_address.address_line_2}` : ''}
                </p>
                <p className="text-body-sm text-text-secondary">
                  {guestPayload.shipping_address.city}, {guestPayload.shipping_address.state_province}{' '}
                  {guestPayload.shipping_address.postal_code}
                </p>
              </div>
            )}

            {/* Payment method selection */}
            <div className="mb-6 rounded-xl border border-border p-4">
              <p className="text-caption font-medium text-text-secondary uppercase tracking-wide mb-3">
                Payment method
              </p>
              {methods.length === 0 ? (
                <p className="text-body-sm text-text-tertiary">No payment methods are available right now.</p>
              ) : (
                <div className="space-y-2" role="radiogroup" aria-label="Payment method">
                  {methods.map((method) => (
                    <MethodCard
                      key={method.id}
                      method={method}
                      selected={selectedMethodId === Number(method.id)}
                      onSelect={() => setSelectedMethodId(Number(method.id))}
                    />
                  ))}
                </div>
              )}
            </div>

            {submissionError && (
              <div role="alert" className="mb-4 rounded-lg bg-danger-subtle border border-danger/20 p-3 text-body-sm text-danger">
                {submissionError}
              </div>
            )}

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
                disabled={!termsAccepted || !selectedMethod || isPending}
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

// ---------------------------------------------------------------------------
// Payment method card
// ---------------------------------------------------------------------------

function MethodCard({
  method,
  selected,
  onSelect,
}: {
  method: PaymentMethod
  selected: boolean
  onSelect: () => void
}) {
  const isManual = MANUAL_PROVIDERS.includes(method.provider as ManualPaymentProvider)
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`w-full rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:shadow-focus-ring ${
        selected ? 'border-accent bg-accent-subtle' : 'border-border hover:border-border-strong'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${selected ? 'bg-accent text-text-inverse' : 'bg-background-subtle text-text-secondary'}`}>
          {methodIcon(method.provider)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-body-sm font-medium text-text-primary">{method.name}</p>
          {method.description && (
            <p className="text-caption text-text-tertiary">{method.description}</p>
          )}
          {isManual && (method.account_number || method.account_name) && (
            <p className="mt-1 text-caption text-text-secondary">
              {[method.account_name, method.account_number].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      </div>
      {selected && isManual && (method.instructions || method.qr_image_url) && (
        <div className="mt-3 rounded-lg bg-surface border border-border p-3">
          {method.instructions && (
            <p className="text-caption whitespace-pre-line text-text-secondary">{method.instructions}</p>
          )}
          {method.qr_image_url && (
            <img
              src={method.qr_image_url}
              alt={`${method.name} QR code`}
              className="mt-2 h-28 w-28 rounded-lg border border-border object-contain"
            />
          )}
        </div>
      )}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Manual payment submission form (after a manual-method order is placed)
// ---------------------------------------------------------------------------

function ManualPaymentForm({
  orderNumber,
  method,
  referenceNumber,
  onReferenceChange,
  receiptFile,
  onReceiptChange,
  notes,
  onNotesChange,
  isSubmitting,
  error,
  onSubmit,
  onBack,
}: {
  orderNumber: string
  method: PaymentMethod | null
  referenceNumber: string
  onReferenceChange: (v: string) => void
  receiptFile: File | null
  onReceiptChange: (f: File | null) => void
  notes: string
  onNotesChange: (v: string) => void
  isSubmitting: boolean
  error: string | null
  onSubmit: () => void
  onBack: () => void
}) {
  return (
    <>
      <Helmet>
        <title>Complete Payment — ShopCore</title>
      </Helmet>
      <PageContainer className="py-8">
        <Stepper steps={STEPS} currentStep={1} className="mb-10 max-w-xl mx-auto" />
        <div className="mx-auto max-w-xl">
          <h1 className="text-heading-lg font-semibold text-text-primary mb-2">Complete your payment</h1>
          <p className="text-body-sm text-text-secondary mb-6">
            Order <span className="font-medium text-text-primary">#{orderNumber}</span> is on hold until we
            verify your payment. Follow the instructions below and submit your transaction details.
          </p>

          <div className="mb-6 rounded-xl border border-border p-4">
            <div className="flex items-start gap-3">
              {method?.qr_image_url ? (
                <img src={method.qr_image_url} alt={`${method?.name ?? 'Payment'} QR code`} className="h-28 w-28 shrink-0 rounded-lg border border-border object-contain" />
              ) : (
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background-subtle text-text-secondary">
                  <QrCode className="h-5 w-5" />
                </span>
              )}
              <div className="min-w-0">
                <p className="text-body-sm font-semibold text-text-primary">{method?.name ?? 'Manual payment'}</p>
                {method?.account_name && <p className="text-body-sm text-text-secondary">Account name: {method.account_name}</p>}
                {method?.account_number && <p className="text-body-sm text-text-secondary">Account number: {method.account_number}</p>}
              </div>
            </div>
            {method?.instructions && (
              <p className="mt-3 whitespace-pre-line rounded-lg bg-background-subtle p-3 text-body-sm text-text-secondary">
                {method.instructions}
              </p>
            )}
          </div>

          {error && (
            <div role="alert" className="mb-4 rounded-lg bg-danger-subtle border border-danger/20 p-3 text-body-sm text-danger">
              {error}
            </div>
          )}

          <form
            className="space-y-4"
            onSubmit={(ev) => {
              ev.preventDefault()
              void onSubmit()
            }}
          >
            <FormField label="Transaction / reference number" required>
              {(id) => (
                <Input
                  id={id}
                  value={referenceNumber}
                  onChange={(e) => onReferenceChange(e.target.value)}
                  placeholder="e.g. TrxID 9H4X2K or bank ref 88231"
                  required
                />
              )}
            </FormField>

            <FormField label="Receipt (optional)" helperText="Screenshot or PDF of your transfer">
              {(id) => (
                <div className="flex items-center gap-3">
                  <input
                    id={id}
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => onReceiptChange(e.target.files?.[0] ?? null)}
                    className="block w-full text-body-sm text-text-secondary file:mr-3 file:rounded-lg file:border-0 file:bg-background-subtle file:px-3 file:py-2 file:text-body-sm file:font-medium file:text-text-primary hover:file:bg-background-subtle-hover"
                  />
                </div>
              )}
            </FormField>
            {receiptFile && (
              <p className="text-caption text-text-secondary">Selected: {receiptFile.name}</p>
            )}

            <FormField label="Notes (optional)">
              {(id) => (
                <textarea
                  id={id}
                  value={notes}
                  onChange={(e) => onNotesChange(e.target.value)}
                  rows={3}
                  placeholder="Anything we should know about this transfer"
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-body-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:shadow-focus-ring"
                />
              )}
            </FormField>

            <div className="flex gap-3">
              <Button type="button" variant="ghost" onClick={onBack}>
                Back
              </Button>
              <Button
                type="submit"
                className="flex-1"
                size="lg"
                disabled={!referenceNumber.trim() || isSubmitting}
                isLoading={isSubmitting}
                loadingText="Submitting…"
              >
                Submit payment details
              </Button>
            </div>
            <p className="text-caption text-text-tertiary">
              Our team verifies manual payments during business hours. You&apos;ll receive an email once your
              order is confirmed.
            </p>
          </form>
        </div>
      </PageContainer>
    </>
  )
}
