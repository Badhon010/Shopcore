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
import type { Order } from '@/types/models'
import { useState } from 'react'

const schema = z.object({
  order_number: z.string().min(1, 'Order number is required'),
  email: emailSchema,
})
type FormData = z.infer<typeof schema>

export function TrackOrderPage() {
  const [order, setOrder] = useState<Order | null>(null)
  const track = useTrackOrder()

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      const result = await track.mutateAsync(data)
      setOrder(result)
    } catch {
      form.setError('root', { message: 'Order not found. Please check your details.' })
    }
  }

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
            Enter your order number and email address to see the latest status and estimated delivery.
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
              <FormField label="Order number" required error={form.formState.errors.order_number?.message}>
                {(id) => (
                  <Input
                    id={id}
                    placeholder="e.g. ORD-123456"
                    {...form.register('order_number')}
                    error={!!form.formState.errors.order_number}
                  />
                )}
              </FormField>
              <FormField label="Email address" required error={form.formState.errors.email?.message}>
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
