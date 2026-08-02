import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { CreditCard, Plus, Pencil, Trash2, QrCode } from 'lucide-react'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { paymentsService, type PaymentMethodPayload } from '@/services/api/payments.service'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/contexts/AuthContext'
import { formatDate } from '@/utils/format'
import type { PaymentMethod, PaymentProvider } from '@/types/models'
import type { ApiError } from '@/types/api'

const PROVIDERS: PaymentProvider[] = [
  'MANUAL', 'BANK_TRANSFER', 'BKASH', 'NAGAD', 'ROCKET',
  'SSLCOMMERZ', 'STRIPE', 'PAYPAL',
]

const methodSchema = z.object({
  provider: z.enum(['MANUAL', 'BANK_TRANSFER', 'BKASH', 'NAGAD', 'ROCKET', 'SSLCOMMERZ', 'STRIPE', 'PAYPAL']),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  is_enabled: z.boolean().default(true),
  sort_order: z.coerce.number().min(0),
  instructions: z.string().optional(),
  account_number: z.string().optional(),
  account_name: z.string().optional(),
  payment_notes: z.string().optional(),
  // The Mode <Select> emits 'true'/'false' strings — coerce both forms.
  is_sandbox: z.union([z.boolean(), z.enum(['true', 'false'])]).transform((v) => v === true || v === 'true'),
})
type MethodFormData = z.infer<typeof methodSchema>

const PAGE_SIZE = 20

export function PaymentMethodsPage() {
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<PaymentMethod | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PaymentMethod | null>(null)
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { isAuthenticated } = useAuth()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-payment-methods', page],
    queryFn: () => paymentsService.listMethods({ page, page_size: PAGE_SIZE }),
    enabled: isAuthenticated,
  })

  const form = useForm<MethodFormData>({
    resolver: zodResolver(methodSchema),
    defaultValues: {
      provider: 'BANK_TRANSFER', name: '', is_enabled: true, sort_order: 0,
      is_sandbox: true,
    },
  })

  const openAdd = () => {
    setEditing(null)
    // If some providers are already seeded, default to the first free one so
    // the Select never shows an empty/unknown value.
    const existing = new Set((data?.results ?? []).map((m) => m.provider))
    const free = PROVIDERS.filter((p) => !existing.has(p))
    const defaultProvider = free[0] ?? 'BANK_TRANSFER'
    form.reset({
      provider: defaultProvider, name: '', description: '', is_enabled: true,
      sort_order: 0, instructions: '', account_number: '', account_name: '',
      payment_notes: '', is_sandbox: true,
    })
    setModalOpen(true)
  }

  const openEdit = (m: PaymentMethod) => {
    setEditing(m)
    form.reset({
      provider: m.provider,
      name: m.name,
      description: m.description ?? '',
      is_enabled: m.is_enabled,
      sort_order: m.sort_order,
      instructions: m.instructions ?? '',
      account_number: m.account_number ?? '',
      account_name: m.account_name ?? '',
      payment_notes: m.payment_notes ?? '',
      is_sandbox: m.is_sandbox,
    })
    setModalOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: (d: MethodFormData) => {
      const payload: PaymentMethodPayload = {
        ...d,
        description: d.description || undefined,
        instructions: d.instructions || undefined,
        account_number: d.account_number || undefined,
        account_name: d.account_name || undefined,
        payment_notes: d.payment_notes || undefined,
      }
      return editing
        ? paymentsService.updateMethod(String(editing.id), payload)
        : paymentsService.createMethod(payload)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-payment-methods'] })
      toast({ title: editing ? 'Payment method updated' : 'Payment method created', variant: 'success' })
      setModalOpen(false)
    },
    onError: (e: ApiError) => toast({ title: e.message, variant: 'destructive' }),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ m }: { m: PaymentMethod }) =>
      paymentsService.updateMethod(String(m.id), { is_enabled: !m.is_enabled }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-payment-methods'] })
      toast({ title: 'Payment method updated', variant: 'success' })
    },
    onError: (e: ApiError) => toast({ title: e.message, variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => paymentsService.deleteMethod(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-payment-methods'] })
      toast({ title: 'Payment method deleted', variant: 'success' })
      setDeleteTarget(null)
    },
    onError: (e: ApiError) => toast({ title: e.message, variant: 'destructive' }),
  })

  const provider = form.watch('provider')
  const isManualProvider = ['BANK_TRANSFER', 'BKASH', 'NAGAD', 'ROCKET'].includes(provider)
  // Each provider maps to exactly one method (backend unique constraint) —
  // hide providers that already exist when creating a new method.
  const existingProviders = new Set((data?.results ?? []).map((m) => m.provider))
  const availableProviders = editing
    ? PROVIDERS
    : PROVIDERS.filter((p) => !existingProviders.has(p))
  const totalPages = Math.ceil((data?.count ?? 0) / PAGE_SIZE)

  const columns: Column<PaymentMethod>[] = [
    {
      key: 'name', header: 'Method',
      render: (m) => (
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-light">
            <CreditCard className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-text-primary">{m.name}</p>
            <p className="text-xs text-text-muted font-mono">{m.provider}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'status', header: 'Status',
      render: (m) => (
        <div className="flex items-center gap-2">
          <Badge variant={m.is_enabled ? 'success' : 'secondary'}>
            {m.is_enabled ? 'Enabled' : 'Disabled'}
          </Badge>
          {!isManualProviderComputed(m.provider) && (
            <Badge variant={m.is_configured ? 'info' : 'warning'}>
              {m.is_configured ? 'Configured' : 'Not configured'}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'mode', header: 'Mode',
      render: (m) => (
        !isManualProviderComputed(m.provider)
          ? <Badge variant="outline">{m.is_sandbox ? 'Sandbox' : 'Live'}</Badge>
          : <span className="text-xs text-text-muted">—</span>
      ),
    },
    {
      key: 'account', header: 'Account',
      render: (m) => (
        <span className="text-sm text-text-secondary">
          {m.account_name || m.account_number || '—'}
        </span>
      ),
    },
    {
      key: 'qr', header: 'QR',
      render: (m) => (m.qr_image ? <QrCode className="h-4 w-4 text-text-muted" /> : <span className="text-xs text-text-muted">—</span>),
    },
    {
      key: 'updated', header: 'Updated',
      render: (m) => <span className="text-xs text-text-muted">{formatDate(m.updated_at)}</span>,
    },
    {
      key: 'actions', header: '', width: '140px', align: 'right',
      render: (m) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost" size="sm"
            onClick={(e) => { e.stopPropagation(); toggleMutation.mutate({ m }) }}
            isLoading={toggleMutation.isPending}
            disabled={toggleMutation.isPending}
          >
            {m.is_enabled ? 'Disable' : 'Enable'}
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Edit" onClick={(e) => { e.stopPropagation(); openEdit(m) }}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost" size="icon-sm" aria-label="Delete"
            className="text-danger hover:bg-danger-subtle"
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(m) }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-text-primary">Payment Methods</h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            Enable/disable checkout methods and configure manual payment details.
          </p>
        </div>
        <Button onClick={openAdd} size="sm">
          <Plus className="h-4 w-4" /> Add Method
        </Button>
      </div>

      <Card padding="none">
        <DataTable
          columns={columns}
          data={data?.results ?? []}
          isLoading={isLoading}
          rowKey={(m) => m.id}
          emptyTitle="No payment methods"
          emptyDescription="Add a payment method to start accepting payments."
          emptyIcon={<CreditCard />}
        />
        {totalPages > 1 && (
          <div className="border-t border-border px-4 py-4">
            {/* Pagination is handled by page state; kept minimal */}
            <div className="flex items-center justify-end gap-2 text-sm text-text-muted">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</Button>
              <span>Page {page} of {totalPages}</span>
              <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          </div>
        )}
      </Card>

      {/* Create / Edit modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Payment Method' : 'Add Payment Method'}
        size="lg"
      >
        <form onSubmit={form.handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Provider" htmlFor="pm-provider" required>
              <Select id="pm-provider" disabled={!!editing} {...form.register('provider')}>
                {availableProviders.map((p) => <option key={p} value={p}>{p}</option>)}
              </Select>
            </FormField>
            <FormField label="Name" htmlFor="pm-name" required error={form.formState.errors.name?.message}>
              <Input id="pm-name" placeholder="Cash on Delivery" {...form.register('name')} />
            </FormField>
          </div>

          <FormField label="Description" htmlFor="pm-desc" hint="Shown to customers during checkout">
            <Input id="pm-desc" {...form.register('description')} />
          </FormField>

          {isManualProvider && (
            <>
              <FormField label="Account name" htmlFor="pm-acct-name">
                <Input id="pm-acct-name" {...form.register('account_name')} />
              </FormField>
              <FormField label="Account number" htmlFor="pm-acct-num">
                <Input id="pm-acct-num" {...form.register('account_number')} />
              </FormField>
              <FormField label="Payment instructions" htmlFor="pm-instructions">
                <textarea
                  id="pm-instructions"
                  rows={3}
                  placeholder="Send the amount to this account, then submit your transaction ID below."
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  {...form.register('instructions')}
                />
              </FormField>
              <FormField label="Payment notes" htmlFor="pm-notes">
                <Input id="pm-notes" {...form.register('payment_notes')} />
              </FormField>
            </>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField label="Sort order" htmlFor="pm-sort" hint="Lower sorts first">
              <Input id="pm-sort" type="number" min={0} {...form.register('sort_order')} />
            </FormField>
            {!isManualProvider && (
              <FormField label="Mode" htmlFor="pm-mode">
                <Select id="pm-mode" {...form.register('is_sandbox')}>
                  <option value="true">Sandbox</option>
                  <option value="false">Live</option>
                </Select>
              </FormField>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="pm-enabled"
              {...form.register('is_enabled')}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            <label htmlFor="pm-enabled" className="text-sm font-medium text-text-primary">
              Enabled (visible at checkout)
            </label>
          </div>

          {!isManualProvider && !editing && (
            <p className="rounded-lg bg-info-subtle p-3 text-xs text-info">
              Gateway credentials come from environment variables (see .env.example). A method shows
              &ldquo;Not configured&rdquo; until the matching credentials are present — customers only see
              methods that are enabled <em>and</em> configured.
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={saveMutation.isPending} loadingText="Saving…">
              {editing ? 'Save Changes' : 'Add Method'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(String(deleteTarget.id))}
        title="Delete Payment Method"
        description={`Delete "${deleteTarget?.name}"? Customers will no longer be able to pay with this method.`}
        confirmLabel="Delete"
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}

function isManualProviderComputed(provider: PaymentProvider): boolean {
  return ['MANUAL', 'BANK_TRANSFER', 'BKASH', 'NAGAD', 'ROCKET'].includes(provider)
}
