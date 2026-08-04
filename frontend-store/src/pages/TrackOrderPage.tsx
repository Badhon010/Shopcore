import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Helmet } from 'react-helmet-async'
import { PackageSearch } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { OrderTracker } from '@/features/orders/components/OrderTracker'
import { useTrackOrder } from '@/features/orders/hooks/useOrders'
import { emailSchema } from '@/utils/validators'
import { guestOrderStore } from '@/utils/guestOrderStore'
import type { Order } from '@/types/models'
import { useEffect, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { ROUTES } from '@/constants/routes'

const PHONE_RE = /^\+?\d{9,15}$/

/**
 * Guest order lookup (audit H-4):
 *   - order number + phone number, OR
 *   - order number + email + lookup token (shown once at checkout)
 * The backend returns the same 404 for a mismatch as for a missing order, so
 * the form must not reveal which part failed.
 */
const schema = z
  .object({
    order_number: z.string().optional(),
    phone_number: z
      .string()
      .optional()
      .refine((v) => !v || PHONE_RE.test(v), 'Enter a valid phone number'),
    email: emailSchema.optional().or(z.literal('')),
    lookup_token: z.string().optional(),
  })
  .refine(
    (data) => !!(data.order_number?.trim() || data.email?.trim() || data.phone_number?.trim() || data.lookup_token?.trim()),
    {
      message: 'Provide at least an order number, phone number, email, or guest tracking code.',
      path: ['order_number'],
    }
  )
type FormData = z.infer<typeof schema>

export function TrackOrderPage() {
  const [searchParams] = useSearchParams()
  const orderNumParam = searchParams.get('order_number') || searchParams.get('number') || searchParams.get('id') || ''
  const emailParam = searchParams.get('email') || ''
  const tokenParam = searchParams.get('token') || searchParams.get('lookup_token') || searchParams.get('guest_lookup_token') || ''

  const [order, setOrder] = useState<Order | null>(null)
  const track = useTrackOrder()

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      order_number: orderNumParam,
      email: emailParam,
      lookup_token: tokenParam,
    },
  })

  const onSubmit = async (data: FormData) => {
    try {
      const result = await track.mutateAsync({
        ...(data.order_number?.trim() ? { order_number: data.order_number.trim() } : {}),
        ...(data.email ? { email: data.email } : {}),
        ...(data.phone_number ? { phone_number: data.phone_number } : {}),
        ...(data.lookup_token ? { lookup_token: data.lookup_token } : {}),
      })
      setOrder(result)
    } catch {
      form.setError('root', { message: 'Order not found. Please check your details.' })
    }
  }

  // Trigger auto lookup on mount if query params are present
  useEffect(() => {
    if (orderNumParam || emailParam || tokenParam) {
      if (orderNumParam) form.setValue('order_number', orderNumParam)
      if (emailParam) form.setValue('email', emailParam)
      if (tokenParam) form.setValue('lookup_token', tokenParam)
      void onSubmit({
        order_number: orderNumParam,
        email: emailParam,
        lookup_token: tokenParam,
      })
    }
  }, [orderNumParam, emailParam, tokenParam])

  return (
    <>
      <Helmet>
        <title>Track Your Order — ShopCore</title>
        <meta name="description" content="Track the status of your ShopCore order." />
      </Helmet>

      {/* Page header */}
      <div className="bg-background-subtle border-b border-border">
        <PageContainer className="py-10 md:py-14">
          <div className="flex items-center gap-4">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary-light">
              <PackageSearch className="h-6 w-6 text-primary" />
            </span>
            <div>
              <span className="text-overline font-semibold uppercase tracking-widest text-primary">
                Orders
              </span>
              <h1 className="text-heading-xl font-bold text-text-primary">Track your order</h1>
            </div>
          </div>
          <p className="mt-3 text-body-md text-text-secondary max-w-lg">
            Enter your order number, guest tracking code (shown once at checkout), or email used at checkout to see the latest status. The tracking code alone is enough.
          </p>
        </PageContainer>
      </div>

      <PageContainer className="py-12">
        <div className="mx-auto max-w-xl">
          <div className="rounded-xl bg-surface border border-border shadow-sm p-8">
            <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-5">
              {form.formState.errors.root && (
                <div role="alert" className="rounded-lg bg-danger-subtle border border-danger/20 p-3 text-body-sm text-danger">
                  {form.formState.errors.root.message}
                </div>
              )}
              <FormField label="Order number" error={form.formState.errors.order_number?.message}>
                {(id) => (
                  <Input
                    id={id}
                    placeholder="e.g. ORD-123456"
                    {...form.register('order_number')}
                    error={!!form.formState.errors.order_number}
                  />
                )}
              </FormField>
              <FormField
                label="Phone number"
                helperText="The phone number used at checkout (guest orders can be tracked with just this)."
                error={form.formState.errors.phone_number?.message}
              >
                {(id) => (
                  <Input
                    id={id}
                    type="tel"
                    placeholder="+8801XXXXXXXXX"
                    {...form.register('phone_number')}
                    error={!!form.formState.errors.phone_number}
                  />
                )}
              </FormField>
              <div className="flex items-center gap-3 text-caption text-text-tertiary">
                <span className="h-px flex-1 bg-border" />
                or
                <span className="h-px flex-1 bg-border" />
              </div>
              <FormField label="Email address" error={form.formState.errors.email?.message}>
                {(id) => (
                  <Input
                    id={id}
                    type="email"
                    placeholder="you@example.com"
                    {...form.register('email')}
                    error={!!form.formState.errors.email}
                  />
                )}
              </FormField>
              <TrackTokenField form={form} orderNumber={form.watch('order_number') || ''} />
              <Button type="submit" className="w-full" size="lg" isLoading={track.isPending} loadingText="Looking up order…">
                Track order
              </Button>
            </form>
          </div>

          {order && (
            <div className="mt-8 rounded-xl bg-surface border border-border shadow-xs p-6">
              <h2 className="text-heading-sm font-semibold text-text-primary mb-4">
                Order #{order.order_number}
              </h2>
              <OrderTracker order={order} />
            </div>
          )}
        </div>
      </PageContainer>
    </>
  )
}

/**
 * Auto-fills the guest lookup token from sessionStorage when the user
 * enters an order number they placed as a guest (the token was stored at
 * checkout). The token stays optional — phone-only lookup still works.
 */
function TrackTokenField({
  form,
  orderNumber,
}: {
  form: ReturnType<typeof useForm<FormData>>
  orderNumber: string
}) {
  const savedToken = orderNumber ? guestOrderStore.get(orderNumber) : null
  const { setValue, register, formState } = form

  // Seed the stored guest lookup token into react-hook-form state (a raw
  // defaultValue prop would not be picked up by register).
  useEffect(() => {
    if (savedToken) {
      setValue('lookup_token', savedToken)
    }
  }, [savedToken, setValue])

  return (
    <>
      {savedToken && (
        <p className="text-caption text-primary">
          A guest tracking code was found for this order — it will be used automatically.
        </p>
      )}
      <FormField
        label="Guest tracking code"
        error={formState.errors.lookup_token?.message}
        helperText={savedToken ? undefined : 'Optional — on its own it also finds your order.'}
      >
        {(id) => (
          <Input
            id={id}
            placeholder="Guest tracking code"
            defaultValue={savedToken ?? ''}
            {...register('lookup_token')}
            error={!!formState.errors.lookup_token}
          />
        )}
      </FormField>
    </>
  )
}
