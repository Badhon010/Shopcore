import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { ArrowLeft, Mail, Calendar, Shield, ShieldOff, UserCheck, UserX, KeyRound, BadgeCheck } from 'lucide-react'
import { customersService } from '@/services/api/customers.service'
import { ordersService } from '@/services/api/orders.service'
import { Card, CardTitle, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Skeleton } from '@/components/feedback/Skeleton'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/contexts/ToastContext'
import { formatCurrency, formatDate } from '@/utils/format'
import { ROUTES } from '@/constants/routes'
import { useState } from 'react'
import type { ApiError } from '@/types/api'

const ORDER_STATUS_VARIANT = {
  DELIVERED: 'success', SHIPPED: 'info', PROCESSING: 'info',
  CONFIRMED: 'info', PENDING: 'warning', CANCELLED: 'danger', REFUNDED: 'default',
} as const

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const qc = useQueryClient()
  const { isAuthenticated } = useAuth()
  const [resetConfirm, setResetConfirm] = useState(false)

  const { data: customer, isLoading } = useQuery({
    queryKey: ['admin-customer', id],
    queryFn: () => customersService.getCustomer(id!),
    enabled: isAuthenticated && !!id,
  })

  const { data: orders } = useQuery({
    queryKey: ['customer-orders', customer?.email],
    queryFn: () => ordersService.listOrders({ page: 1, page_size: 10, search: customer!.email }),
    enabled: isAuthenticated && !!customer?.email,
  })

  function onActionSuccess(msg: string) {
    toast({ title: msg, variant: 'success' })
    void qc.invalidateQueries({ queryKey: ['admin-customer', id] })
    void qc.invalidateQueries({ queryKey: ['admin-customers'] })
  }

  const activateMutation = useMutation({
    mutationFn: () => customersService.activateUser(id!),
    onSuccess: () => onActionSuccess('User activated'),
    onError: (e: ApiError) => toast({ title: e.message, variant: 'destructive' }),
  })

  const deactivateMutation = useMutation({
    mutationFn: () => customersService.deactivateUser(id!),
    onSuccess: () => onActionSuccess('User deactivated'),
    onError: (e: ApiError) => toast({ title: e.message, variant: 'destructive' }),
  })

  const promoteStaffMutation = useMutation({
    mutationFn: () => customersService.promoteStaff(id!),
    onSuccess: () => onActionSuccess('User promoted to staff'),
    onError: (e: ApiError) => toast({ title: e.message, variant: 'destructive' }),
  })

  const removeStaffMutation = useMutation({
    mutationFn: () => customersService.removeStaff(id!),
    onSuccess: () => onActionSuccess('Staff status removed'),
    onError: (e: ApiError) => toast({ title: e.message, variant: 'destructive' }),
  })

  const verifyEmailMutation = useMutation({
    mutationFn: () => customersService.forceVerifyEmail(id!),
    onSuccess: () => onActionSuccess('Email verified'),
    onError: (e: ApiError) => toast({ title: e.message, variant: 'destructive' }),
  })

  const resetPasswordMutation = useMutation({
    mutationFn: () => customersService.resetPassword(id!),
    onSuccess: () => { toast({ title: 'Password reset email sent', variant: 'success' }); setResetConfirm(false) },
    onError: (e: ApiError) => toast({ title: e.message, variant: 'destructive' }),
  })

  if (isLoading) return (
    <div className="space-y-5">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
  if (!customer) return null

  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: 'Customers', href: ROUTES.CUSTOMERS }, { label: customer.full_name || customer.email }]} />
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-md" onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-lg font-semibold text-text-primary">{customer.full_name || customer.email}</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Customer card */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <div className="flex flex-col items-center gap-3 text-center">
              <Avatar name={customer.full_name || customer.email} size="lg" />
              <div>
                <p className="font-medium text-text-primary">{customer.full_name || '—'}</p>
                <div className="mt-1 flex items-center justify-center gap-1.5 text-sm text-text-muted">
                  <Mail className="h-3.5 w-3.5" />{customer.email}
                </div>
              </div>
              <div className="flex flex-wrap justify-center gap-1.5">
                <Badge variant={customer.is_active ? 'success' : 'default'}>
                  {customer.is_active ? 'Active' : 'Inactive'}
                </Badge>
                {customer.is_staff && <Badge variant="info">Staff</Badge>}
                {customer.is_email_verified
                  ? <Badge variant="success">Email verified</Badge>
                  : <Badge variant="warning">Email unverified</Badge>}
              </div>
            </div>
            <div className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm">
              <div className="flex items-center gap-2 text-text-muted">
                <Calendar className="h-3.5 w-3.5" />
                <span>Joined {formatDate(customer.date_joined ?? '')}</span>
              </div>
              {customer.last_login && (
                <div className="flex items-center gap-2 text-text-muted">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Last login {formatDate(customer.last_login)}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
            <div className="space-y-2">
              {customer.is_active ? (
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full justify-start text-danger hover:bg-danger-subtle"
                  isLoading={deactivateMutation.isPending}
                  onClick={() => deactivateMutation.mutate()}
                >
                  <UserX className="h-4 w-4" /> Deactivate account
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full justify-start text-success hover:bg-success-subtle"
                  isLoading={activateMutation.isPending}
                  onClick={() => activateMutation.mutate()}
                >
                  <UserCheck className="h-4 w-4" /> Activate account
                </Button>
              )}

              {customer.is_staff ? (
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full justify-start text-warning hover:bg-warning-subtle"
                  isLoading={removeStaffMutation.isPending}
                  onClick={() => removeStaffMutation.mutate()}
                >
                  <ShieldOff className="h-4 w-4" /> Remove staff status
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full justify-start"
                  isLoading={promoteStaffMutation.isPending}
                  onClick={() => promoteStaffMutation.mutate()}
                >
                  <Shield className="h-4 w-4" /> Promote to staff
                </Button>
              )}

              {!customer.is_email_verified && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full justify-start"
                  isLoading={verifyEmailMutation.isPending}
                  onClick={() => verifyEmailMutation.mutate()}
                >
                  <BadgeCheck className="h-4 w-4" /> Force verify email
                </Button>
              )}

              <Button
                variant="secondary"
                size="sm"
                className="w-full justify-start"
                onClick={() => setResetConfirm(true)}
              >
                <KeyRound className="h-4 w-4" /> Send password reset
              </Button>
            </div>
          </Card>
        </div>

        {/* Orders */}
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
                    <Badge variant={ORDER_STATUS_VARIANT[order.status as keyof typeof ORDER_STATUS_VARIANT] ?? 'default'}>
                      {order.status}
                    </Badge>
                    <span className="text-sm font-medium text-text-primary">{formatCurrency(order.grand_total)}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={resetConfirm}
        onClose={() => setResetConfirm(false)}
        onConfirm={() => resetPasswordMutation.mutate()}
        title="Send password reset?"
        description={`A password reset email will be sent to ${customer.email}.`}
        confirmLabel="Send email"
        isLoading={resetPasswordMutation.isPending}
      />
    </div>
  )
}
