import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { PageContainer } from '@/components/layout/PageContainer'
import { Stepper } from '@/components/ui/Stepper'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/feedback/Spinner'
import { AddressForm } from '@/features/account/components/AddressForm'
import { useAddresses, useCreateAddress } from '@/features/account/hooks/useProfile'
import { useAuth } from '@/contexts/AuthContext'
import { ROUTES } from '@/constants/routes'

const STEPS = [
  { label: 'Shipping' },
  { label: 'Payment' },
  { label: 'Review' },
]

/**
 * Step 1 of checkout — collect a shipping address.
 *
 * The selected address ID is carried to the next step via React Router
 * navigation state (`location.state.shippingAddressId`), so no server-side
 * session is needed.  When the user picks a saved address we navigate
 * immediately; when they enter a new one we create it first, then navigate.
 */
export function CheckoutPage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { data: savedAddresses, isLoading } = useAddresses()
  const createAddress = useCreateAddress()
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)

  const goToPayment = (addressId: string) => {
    navigate(ROUTES.CHECKOUT_PAYMENT, { state: { shippingAddressId: addressId } })
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

              <p className="text-center text-body-sm text-text-tertiary">— or enter a new address —</p>
            </div>
          )}

          {/* New address form — creates the address then proceeds */}
          <AddressForm
            onSubmit={async (data) => {
              const address = await createAddress.mutateAsync(data)
              goToPayment(address.id)
            }}
            isSubmitting={createAddress.isPending}
            submitLabel="Continue to payment"
          />
        </div>
      </PageContainer>
    </>
  )
}
