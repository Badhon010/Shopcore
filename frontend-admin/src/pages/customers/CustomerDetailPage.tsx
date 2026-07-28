import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Mail, Calendar } from 'lucide-react'
import { customersService } from '@/services/api/customers.service'
import { ordersService } from '@/services/api/orders.service'
import { Card, CardTitle, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Skeleton } from '@/components/feedback/Skeleton'
import { formatCurrency, formatDate } from '@/utils/format'
import { ROUTES } from '@/constants/routes'

const ORDER_STATUS_VARIANT = {
  DELIVERED: 'success', SHIPPED: 'info', PROCESSING: 'info',
  CONFIRMED: 'info', PENDING: 'warning', CANCELLED: 'danger', REFUNDED: 'default',
} as const

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: customer, isLoading } = useQuery({
    queryKey: ['admin-customer', id],
    queryFn: () => customersService.getCustomer(id!),
    enabled: !!id,
  })

  const { data: orders } = useQuery({
    queryKey: ['customer-orders', id],
    queryFn: () => ordersService.listOrders({ page: 1, page_size: 10, search: customer?.email }),
    enabled: !!customer?.email,
  })

  if (isLoading) return <div className="space-y-5"><Skeleton className="h-6 w-48" /><Skeleton className="h-64 w-full" /></div>
  if (!customer) return null

  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: 'Customers', href: ROUTES.CUSTOMERS }, { label: customer.full_name || customer.email }]} />
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-md" onClick={() => navigate(-1)} aria-label="Back"><ArrowLeft className="h-4 w-4" /></Button>
        <h1 className="text-lg font-semibold text-text-primary">{customer.full_name || customer.email}</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <div className="flex flex-col items-center gap-3 text-center">
            <Avatar name={customer.full_name || customer.email} size="lg" />
            <div>
              <p className="font-medium text-text-primary">{customer.full_name || '—'}</p>
              <div className="mt-1 flex items-center gap-1.5 text-sm text-text-muted">
                <Mail className="h-3.5 w-3.5" />{customer.email}
              </div>
            </div>
            <Badge variant={customer.is_active ? 'success' : 'default'}>{customer.is_active ? 'Active' : 'Inactive'}</Badge>
          </div>
          <div className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex items-center gap-2 text-text-muted">
              <Calendar className="h-3.5 w-3.5" />
              <span>Joined {formatDate(customer.date_joined ?? '')}</span>
            </div>
          </div>
        </Card>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Recent orders</CardTitle></CardHeader>
            {orders?.results.length === 0 && <p className="text-sm text-text-muted">No orders yet.</p>}
            <div className="space-y-2">
              {orders?.results.map((order) => (
                <div key={order.order_number} className="flex items-center justify-between border-b border-border-light pb-2 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-text-primary">#{order.order_number}</p>
                    <p className="text-xs text-text-muted">{formatDate(order.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={ORDER_STATUS_VARIANT[order.status as keyof typeof ORDER_STATUS_VARIANT] ?? 'default'}>{order.status}</Badge>
                    <span className="text-sm font-medium text-text-primary">{formatCurrency(order.grand_total)}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
