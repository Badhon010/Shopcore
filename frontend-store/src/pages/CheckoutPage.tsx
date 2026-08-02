import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { PageContainer } from '@/components/layout/PageContainer'
import { Stepper } from '@/components/ui/Stepper'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/feedback/Spinner'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { AddressForm } from '@/features/account/components/AddressForm'
import { useAddresses, useCreateAddress } from '@/features/account/hooks/useProfile'
import { useAuth } from '@/contexts/AuthContext'
import { ROUTES } from '@/constants/routes'
import { guestCartToken } from '@/services/api/cart.service'
import {
  buildGuestPlaceOrderPayload,
  guestCheckoutSchema,
  type GuestCheckoutFormData,
} from '@/features/checkout/guestCheckoutForm'
import type { GuestPlaceOrderPayload } from '@/services/api/checkout.service'

const STEPS = [
  { label: 'Shipping' },
  { label: 'Payment' },
  { label: 'Review' },
]

/**
 * Step 1 of checkout — collect a shipping address.
 *
 * Authenticated: pick a saved address or create a new one (AddressForm); the
 * selected address ID is carried to PaymentPage via navigation state.
 *
 * Guest (audit H-4): no account and no saved addresses — the guest supplies
 * identity (name/email/phone) + a shipping address snapshot inline, which
 * PaymentPage sends to POST /orders/checkout/ as the guest payload.
 */
export function CheckoutPage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { data: savedAddresses, isLoading } = useAddresses()
  const createAddress = useCreateAddress()
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [isGuestSubmitting, setIsGuestSubmitting] = useState(false)

  const goToPayment = (addressId: string) => {
    navigate(ROUTES.CHECKOUT_PAYMENT, { state: { shippingAddressId: addressId } })
  }

  const goToPaymentGuest = (guest: GuestPlaceOrderPayload) => {
    // Ensure a guest cart token exists — the backend needs it to resolve the
    // guest cart during checkout (guest_session_id + cart items).
    guestCartToken.ensure()
    navigate(ROUTES.CHECKOUT_PAYMENT, { state: { guest } })
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <>
      <Helmet>
        <title>Checkout — ShopCore</title>
      </Helmet>
      <PageContainer className="py-8">
        <Stepper steps={STEPS} currentStep={0} className="mb-10 max-w-xl mx-auto" />

        <div className="mx-auto max-w-lg">
          <h1 className="text-heading-lg font-semibold text-text-primary mb-6">Shipping address</h1>

          {!isAuthenticated && (
            <div className="mb-6 rounded-lg bg-background-subtle border border-border p-4">
              <p className="text-body-sm text-text-secondary">
                <span className="font-medium text-text-primary">Guest checkout.</span> You can check out
                without an account — we&apos;ll send the confirmation to your email.
              </p>
            </div>
          )}

          {/* Saved address picker (authenticated users only) */}
          {isAuthenticated && savedAddresses && savedAddresses.length > 0 && (
            <div className="mb-6 space-y-2">
              <p className="text-body-sm font-medium text-text-primary">Saved addresses</p>
              {savedAddresses.map((addr) => (
                <button
                  key={addr.id}
                  onClick={() => setSelectedAddressId(addr.id)}
                  className={`w-full rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:shadow-focus-ring ${
                    selectedAddressId === addr.id
                      ? 'border-accent bg-accent-subtle'
                      : 'border-border hover:border-border-strong'
                  }`}
                >
                  <p className="text-body-sm font-medium text-text-primary">
                    {addr.full_name}
                    {addr.is_default && (
                      <span className="ml-2 text-caption text-accent">(Default)</span>
                    )}
                  </p>
                  <p className="text-body-sm text-text-secondary">
                    {addr.address_line_1}, {addr.city}, {addr.state_province} {addr.postal_code}
                  </p>
                </button>
              ))}

              {selectedAddressId && (
                <Button className="w-full" onClick={() => goToPayment(selectedAddressId)}>
                  Continue with this address
                </Button>
              )}

              {isAuthenticated && (
                <p className="text-center text-body-sm text-text-tertiary">— or enter a new address —</p>
              )}
            </div>
          )}

          {!isAuthenticated ? (
            <GuestCheckoutForm
              onSubmit={(data) => goToPaymentGuest(buildGuestPlaceOrderPayload(data))}
              isSubmitting={isGuestSubmitting}
              onSubmittingChange={setIsGuestSubmitting}
            />
          ) : (
            /* New address form (authenticated) — creates the address then proceeds */
            <AddressForm
              onSubmit={async (data) => {
                const address = await createAddress.mutateAsync(data)
                goToPayment(address.id)
              }}
              isSubmitting={createAddress.isPending}
              submitLabel="Continue to payment"
            />
          )}
        </div>
      </PageContainer>
    </>
  )
}

// ---------------------------------------------------------------------------
// Guest checkout form — collects guest identity + shipping snapshot inline.
// ---------------------------------------------------------------------------

interface GuestCheckoutFormProps {
  onSubmit: (data: GuestCheckoutFormData) => void | Promise<void>
  isSubmitting?: boolean
  onSubmittingChange?: (v: boolean) => void
}

export function GuestCheckoutForm({
  onSubmit,
  isSubmitting,
  onSubmittingChange,
}: GuestCheckoutFormProps) {
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = async (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault()
    const fd = new FormData(ev.currentTarget)
    const raw: Record<string, string> = {}
    fd.forEach((value, key) => {
      // All guest-form fields are text inputs — FormData can carry File
      // objects in general, but none here. Guard anyway for type-safety.
      raw[key] = typeof value === 'string' ? value : ''
    })
    const parsed = guestCheckoutSchema.safeParse(raw)
    if (!parsed.success) {
      const next: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? '')
        if (key && !next[key]) next[key] = issue.message
      }
      setErrors(next)
      return
    }
    setErrors({})
    onSubmittingChange?.(true)
    try {
      await onSubmit(parsed.data)
    } finally {
      onSubmittingChange?.(false)
    }
  }

  const err = (key: string): string | undefined => errors[key]

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="rounded-xl border border-border p-4 space-y-4">
        <p className="text-caption font-medium text-text-secondary uppercase tracking-wide">Your details</p>
        <FormField label="Full name" required error={err('guest_name')}>
          {(id) => (
            <Input id={id} name="guest_name" autoComplete="name" placeholder="Jane Smith" error={!!err('guest_name')} />
          )}
        </FormField>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Email" required error={err('guest_email')}>
            {(id) => (
              <Input id={id} name="guest_email" type="email" autoComplete="email" placeholder="you@example.com" error={!!err('guest_email')} />
            )}
          </FormField>
          <FormField label="Phone" required error={err('guest_phone')}>
            {(id) => (
              <Input id={id} name="guest_phone" type="tel" autoComplete="tel" placeholder="+8801XXXXXXXXX" error={!!err('guest_phone')} />
            )}
          </FormField>
        </div>
      </div>

      <div className="rounded-xl border border-border p-4 space-y-4">
        <p className="text-caption font-medium text-text-secondary uppercase tracking-wide">Shipping address</p>
        <FormField label="Address line 1" required error={err('address_line_1')}>
          {(id) => (
            <Input id={id} name="address_line_1" autoComplete="address-line1" error={!!err('address_line_1')} />
          )}
        </FormField>
        <FormField label="Address line 2" error={err('address_line_2')}>
          {(id) => (
            <Input id={id} name="address_line_2" autoComplete="address-line2" error={!!err('address_line_2')} />
          )}
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="City" required error={err('city')}>
            {(id) => (
              <Input id={id} name="city" autoComplete="address-level2" error={!!err('city')} />
            )}
          </FormField>
          <FormField label="State / Province" required error={err('state_province')}>
            {(id) => (
              <Input id={id} name="state_province" autoComplete="address-level1" error={!!err('state_province')} />
            )}
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Postal code" required error={err('postal_code')}>
            {(id) => (
              <Input id={id} name="postal_code" autoComplete="postal-code" error={!!err('postal_code')} />
            )}
          </FormField>
          <FormField label="Country" required error={err('country')}>
            {(id) => (
              <Input id={id} name="country" autoComplete="country" placeholder="BD" maxLength={2} error={!!err('country')} />
            )}
          </FormField>
        </div>
      </div>

      <Button type="submit" isLoading={isSubmitting} className="w-full" size="lg">
        Continue to payment
      </Button>
    </form>
  )
}
