import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Helmet } from 'react-helmet-async'
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
      <PageContainer className="py-12">
        <div className="mx-auto max-w-xl">
          <h1 className="text-heading-xl font-semibold text-text-primary">Track your order</h1>
          <p className="mt-2 text-body-md text-text-secondary">
            Enter your order number and email address to see the latest status.
          </p>

          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="mt-8 space-y-4">
            {form.formState.errors.root && (
              <div role="alert" className="rounded-lg bg-danger-subtle border border-danger/20 p-3 text-body-sm text-danger">
                {form.formState.errors.root.message}
              </div>
            )}
            <FormField label="Order number" required error={form.formState.errors.order_number?.message}>
              {(id) => (
                <Input id={id} placeholder="e.g. ORD-123456" {...form.register('order_number')} error={!!form.formState.errors.order_number} />
              )}
            </FormField>
            <FormField label="Email address" required error={form.formState.errors.email?.message}>
              {(id) => (
                <Input id={id} type="email" placeholder="you@example.com" {...form.register('email')} error={!!form.formState.errors.email} />
              )}
            </FormField>
            <Button type="submit" className="w-full" isLoading={track.isPending}>
              Track order
            </Button>
          </form>

          {order && (
            <div className="mt-10">
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
