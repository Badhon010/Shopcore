import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { PageContainer } from '@/components/layout/PageContainer'
import { Stepper } from '@/components/ui/Stepper'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/feedback/Spinner'
import { AddressForm } from '@/features/account/components/AddressForm'
import { useCheckoutSession, useUpdateCheckoutSession } from '@/features/checkout/hooks/useCheckout'
import { useAddresses } from '@/features/account/hooks/useProfile'
import { useAuth } from '@/contexts/AuthContext'
import { buildRoute } from '@/constants/routes'

const STEPS = [
  { label: 'Shipping' },
  { label: 'Payment' },
  { label: 'Review' },
]

export function CheckoutPage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { data: session, isLoading } = useCheckoutSession()
  const { data: savedAddresses } = useAddresses()
  const updateSession = useUpdateCheckoutSession()
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)

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
                    {addr.first_name} {addr.last_name}
                    {addr.is_default && <span className="ml-2 text-caption text-accent">(Default)</span>}
                  </p>
                  <p className="text-body-sm text-text-secondary">
                    {addr.address_line_1}, {addr.city}, {addr.state} {addr.postal_code}
                  </p>
                </button>
              ))}
              {selectedAddressId && (
                <Button
                  className="w-full"
                  onClick={() => {
                    void updateSession.mutateAsync({ shipping_address: { id: selectedAddressId } }).then(() =>
                      navigate('/checkout/payment')
                    )
                  }}
                  isLoading={updateSession.isPending}
                >
                  Continue with this address
                </Button>
              )}
              <p className="text-center text-body-sm text-text-tertiary">— or enter a new address —</p>
            </div>
          )}

          <AddressForm
            onSubmit={async (data) => {
              await updateSession.mutateAsync({ shipping_address: data })
              navigate('/checkout/payment')
            }}
            isSubmitting={updateSession.isPending}
            submitLabel="Continue to payment"
          />
        </div>
      </PageContainer>
    </>
  )
}
