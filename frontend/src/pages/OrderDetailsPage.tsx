import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ChevronLeft, Printer } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/feedback/Spinner'
import { ErrorState } from '@/components/feedback/ErrorState'
import { OrderTracker } from '@/features/orders/components/OrderTracker'
import { CartLineItem } from '@/features/cart/components/CartLineItem'
import { useOrder, useCancelOrder } from '@/features/orders/hooks/useOrders'
import { formatCurrency } from '@/utils/formatCurrency'
import { formatDate } from '@/utils/formatDate'
import { ROUTES } from '@/constants/routes'
import type { OrderItem } from '@/types/models'

export function OrderDetailsPage() {
  const { orderNumber = '' } = useParams()
  const { data: order, isLoading, error, refetch } = useOrder(orderNumber)
  const cancelOrder = useCancelOrder()
  const [cancelModalOpen, setCancelModalOpen] = useState(false)

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>
  if (error || !order) return <ErrorState onRetry={refetch} />

  return (
    <>
      <Helmet>
        <title>Order #{order.order_number} — ShopCore</title>
      </Helmet>
      <div>
        <div className="flex items-center gap-2 mb-6">
          <Link to={ROUTES.ACCOUNT_ORDERS} className="flex items-center gap-1 text-body-sm text-text-secondary hover:text-text-primary transition-colors">
            <ChevronLeft className="h-4 w-4" />
            Back to orders
          </Link>
        </div>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-heading-lg font-semibold text-text-primary">Order #{order.order_number}</h1>
            <p className="text-body-sm text-text-secondary">Placed on {formatDate(order.created_at)}</p>
          </div>
          <div className="flex gap-2 no-print">
            <Button variant="secondary" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Invoice
            </Button>
            {order.can_cancel && (
              <Button variant="destructive" size="sm" onClick={() => setCancelModalOpen(true)}>
                Cancel order
              </Button>
            )}
          </div>
        </div>

        {/* Tracker */}
        <div className="mb-8 rounded-xl border border-border p-6">
          <OrderTracker order={order} />
        </div>

        {/* Items */}
        <div className="rounded-xl border border-border divide-y divide-border mb-6">
          {order.items.map((item: OrderItem) => {
            // Map OrderItem to CartItem shape for CartLineItem
            const cartItem = {
              id: item.id,
              product: item.product,
              variant: item.variant,
              quantity: item.quantity,
              unit_price: item.unit_price,
              total_price: item.total_price,
            }
            return (
              <div key={item.id} className="px-6">
                <CartLineItem item={cartItem} compact />
              </div>
            )
          })}
        </div>

        {/* Order summary */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="rounded-xl border border-border p-6 space-y-2">
            <h3 className="text-body-md font-semibold text-text-primary mb-3">Order summary</h3>
            {[
              { label: 'Subtotal', value: formatCurrency(order.subtotal) },
              ...(order.discount ? [{ label: 'Discount', value: `-${formatCurrency(order.discount)}` }] : []),
              { label: 'Shipping', value: formatCurrency(order.shipping_cost) },
              ...(order.tax ? [{ label: 'Tax', value: formatCurrency(order.tax) }] : []),
              { label: 'Total', value: formatCurrency(order.total), bold: true },
            ].map(({ label, value, bold }) => (
              <div key={label} className="flex justify-between text-body-sm">
                <span className={bold ? 'font-semibold text-text-primary' : 'text-text-secondary'}>{label}</span>
                <span className={bold ? 'font-bold text-text-primary' : 'text-text-primary'}>{value}</span>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-border p-6">
            <h3 className="text-body-md font-semibold text-text-primary mb-3">Shipping address</h3>
            <address className="not-italic text-body-sm text-text-secondary space-y-0.5">
              <p>{order.shipping_address.full_name}</p>
              <p>{order.shipping_address.address_line_1}</p>
              {order.shipping_address.address_line_2 && <p>{order.shipping_address.address_line_2}</p>}
              <p>{order.shipping_address.city}, {order.shipping_address.state_province} {order.shipping_address.postal_code}</p>
              <p>{order.shipping_address.country}</p>
            </address>
          </div>
        </div>
      </div>

      <Modal
        open={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Cancel order"
        description="Are you sure you want to cancel this order? This action cannot be undone."
      >
        <div className="flex gap-3 justify-end mt-4">
          <Button variant="ghost" onClick={() => setCancelModalOpen(false)}>
            Keep order
          </Button>
          <Button
            variant="destructive"
            isLoading={cancelOrder.isPending}
            onClick={() => {
              cancelOrder.mutate(order.order_number, {
                onSettled: () => setCancelModalOpen(false),
              })
            }}
          >
            Cancel order
          </Button>
        </div>
      </Modal>
    </>
  )
}
