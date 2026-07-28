import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Tag, Plus, Pencil, Trash2 } from 'lucide-react'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SearchBar } from '@/components/ui/SearchBar'
import { Select } from '@/components/ui/Select'
import { Pagination } from '@/components/ui/Pagination'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { couponsService } from '@/services/api/coupons.service'
import { useToast } from '@/contexts/ToastContext'
import { formatDate, formatCurrency } from '@/utils/format'
import type { Coupon } from '@/types/models'
import type { ApiError } from '@/types/api'

const couponSchema = z.object({
  code:                       z.string().min(1, 'Code is required'),
  discount_type:              z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),
  discount_value:             z.string().min(1, 'Value is required'),
  minimum_order_amount:       z.string().optional(),
  max_discount_amount:        z.string().optional(),
  valid_from:                 z.string().min(1, 'Start date is required'),
  valid_until:                z.string().min(1, 'End date is required'),
  usage_limit_total:          z.string().optional(),
  usage_limit_per_user:   z.string().optional(),
  is_active:                  z.boolean().default(true),
})
type CouponFormData = z.infer<typeof couponSchema>

function toDatetimeLocal(iso: string) {
  if (!iso) return ''
  try { return new Date(iso).toISOString().slice(0, 16) } catch { return '' }
}

export function CouponsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Coupon | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-coupons', page, search, activeFilter],
    queryFn: () =>
      couponsService.getCoupons({
        page,
        page_size: 20,
        search: search || undefined,
        is_active: activeFilter === 'all' ? undefined : activeFilter === 'active',
      }),
  })

  const form = useForm<CouponFormData>({
    resolver: zodResolver(couponSchema),
    defaultValues: { code: '', discount_type: 'PERCENTAGE', discount_value: '', valid_from: '', valid_until: '', is_active: true },
  })

  const openAdd = () => { setEditing(null); form.reset({ code: '', discount_type: 'PERCENTAGE', discount_value: '', valid_from: '', valid_until: '', is_active: true }); setModalOpen(true) }
  const openEdit = (c: Coupon) => {
    setEditing(c)
    form.reset({
      code: c.code,
      discount_type: c.discount_type,
      discount_value: c.discount_value,
      minimum_order_amount: c.minimum_order_amount ?? '',
      max_discount_amount: c.max_discount_amount ?? '',
      valid_from: toDatetimeLocal(c.valid_from),
      valid_until: toDatetimeLocal(c.valid_until),
      usage_limit_total:        c.usage_limit_total        != null ? String(c.usage_limit_total)        : '',
      usage_limit_per_user: c.usage_limit_per_user != null ? String(c.usage_limit_per_user) : '',
      is_active: c.is_active,
    })
    setModalOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: (d: CouponFormData) => {
      const payload = {
        ...d,
        code: d.code.toUpperCase(),
        minimum_order_amount: d.minimum_order_amount || null,
        max_discount_amount: d.max_discount_amount || null,
        usage_limit_total:        d.usage_limit_total        ? parseInt(d.usage_limit_total)        : null,
        usage_limit_per_user: d.usage_limit_per_user ? parseInt(d.usage_limit_per_user) : null,
      }
      return editing
        ? couponsService.updateCoupon(editing.id, payload)
        : couponsService.createCoupon(payload)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-coupons'] })
      toast({ title: editing ? 'Coupon updated' : 'Coupon created', variant: 'success' })
      setModalOpen(false)
    },
    onError: (e: ApiError) => toast({ title: e.message, variant: 'error' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => couponsService.deleteCoupon(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-coupons'] })
      toast({ title: 'Coupon deleted', variant: 'success' })
      setDeleteTarget(null)
    },
    onError: (e: ApiError) => toast({ title: e.message, variant: 'error' }),
  })

  const discountType = form.watch('discount_type')

  const columns: Column<Coupon>[] = [
    {
      key: 'code',
      header: 'Code',
      cell: (c) => <span className="font-mono font-bold text-text-primary">{c.code}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      cell: (c) => (
        <Badge variant={c.discount_type === 'PERCENTAGE' ? 'info' : 'success'}>
          {c.discount_type === 'PERCENTAGE' ? '% Off' : 'Fixed'}
        </Badge>
      ),
    },
    {
      key: 'discount',
      header: 'Discount',
      cell: (c) =>
        c.discount_type === 'PERCENTAGE'
          ? <span className="font-medium text-text-primary">{c.discount_value}%</span>
          : <span className="font-medium text-text-primary">{formatCurrency(c.discount_value)}</span>,
    },
    {
      key: 'validity',
      header: 'Valid',
      cell: (c) => (
        <span className="text-body-sm text-text-secondary">
          {formatDate(c.valid_from)} → {formatDate(c.valid_until)}
        </span>
      ),
    },
    {
      key: 'usage',
      header: 'Usage',
      cell: (c) => (
        <span className="font-mono text-body-sm text-text-secondary">
          {c.times_used}/{c.usage_limit_total ?? '∞'}
        </span>
      ),
    },
    {
      key: 'active',
      header: 'Active',
      cell: (c) => <Badge variant={c.is_active ? 'success' : 'secondary'}>{c.is_active ? 'Active' : 'Inactive'}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      headerClassName: 'w-24',
      cell: (c) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" aria-label="Edit" onClick={(e) => { e.stopPropagation(); openEdit(c) }}><Pencil className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon-sm" aria-label="Delete" className="text-danger hover:bg-danger-subtle" onClick={(e) => { e.stopPropagation(); setDeleteTarget(c) }}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-heading-lg font-bold text-text-primary">Coupons</h1>
          <p className="mt-0.5 text-body-sm text-text-secondary">{data?.count ?? 0} discount codes</p>
        </div>
        <Button onClick={openAdd} size="sm"><Plus className="h-4 w-4" aria-hidden /> Create Coupon</Button>
      </div>

      <Card noPadding>
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <SearchBar
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            onClear={() => { setSearch(''); setPage(1) }}
            placeholder="Search codes…"
            containerClassName="w-full max-w-xs"
          />
          <Select value={activeFilter} onChange={(e) => { setActiveFilter(e.target.value); setPage(1) }} containerClassName="w-40" className="h-10">
            <option value="all">All coupons</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </Select>
        </div>
        <DataTable
          columns={columns}
          data={data?.results ?? []}
          isLoading={isLoading}
          keyExtractor={(c) => c.id}
          emptyIcon={Tag}
          emptyTitle="No coupons yet"
          emptyDescription="Create discount codes for your customers."
        />
        {data && data.count > 20 && (
          <div className="border-t border-border px-4 py-4">
            <Pagination page={page} pageSize={20} total={data.count} onPageChange={setPage} />
          </div>
        )}
      </Card>

      <Modal open={modalOpen} onOpenChange={setModalOpen} title={editing ? 'Edit Coupon' : 'Create Coupon'} size="lg">
        <form onSubmit={form.handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Code" required error={form.formState.errors.code?.message}>
              {(id, errorId) => <Input id={id} errorId={errorId} error={!!form.formState.errors.code} placeholder="SUMMER20" className="uppercase" {...form.register('code')} />}
            </FormField>
            <FormField label="Type" required>
              {(id) => (
                <Select id={id} {...form.register('discount_type')}>
                  <option value="PERCENTAGE">Percentage (%)</option>
                  <option value="FIXED_AMOUNT">Fixed Amount ($)</option>
                </Select>
              )}
            </FormField>
            <FormField label={discountType === 'PERCENTAGE' ? 'Discount (%)' : 'Discount Amount'} required error={form.formState.errors.discount_value?.message}>
              {(id, errorId) => <Input id={id} errorId={errorId} error={!!form.formState.errors.discount_value} type="number" step="0.01" placeholder={discountType === 'PERCENTAGE' ? '15' : '10.00'} {...form.register('discount_value')} />}
            </FormField>
            <FormField label="Min. Order Amount">
              {(id) => <Input id={id} type="number" step="0.01" placeholder="0.00" {...form.register('minimum_order_amount')} />}
            </FormField>
            {discountType === 'PERCENTAGE' && (
              <FormField label="Max. Discount Cap">
                {(id) => <Input id={id} type="number" step="0.01" placeholder="Optional cap" {...form.register('max_discount_amount')} />}
              </FormField>
            )}
            <FormField label="Total Usage Limit" helperText="All customers combined">
              {(id) => <Input id={id} type="number" min="1" placeholder="Unlimited" {...form.register('usage_limit_total')} />}
            </FormField>
            <FormField label="Per-Customer Limit" helperText="Max uses per individual customer">
              {(id) => <Input id={id} type="number" min="1" placeholder="Unlimited" {...form.register('usage_limit_per_user')} />}
            </FormField>
            <FormField label="Valid From" required error={form.formState.errors.valid_from?.message}>
              {(id, errorId) => <Input id={id} errorId={errorId} error={!!form.formState.errors.valid_from} type="datetime-local" {...form.register('valid_from')} />}
            </FormField>
            <FormField label="Valid Until" required error={form.formState.errors.valid_until?.message}>
              {(id, errorId) => <Input id={id} errorId={errorId} error={!!form.formState.errors.valid_until} type="datetime-local" {...form.register('valid_until')} />}
            </FormField>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_active" {...form.register('is_active')} className="h-4 w-4 rounded border-border accent-primary" />
            <label htmlFor="is_active" className="text-body-sm font-medium text-text-primary">Active</label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm" isLoading={saveMutation.isPending} loadingText="Saving…">{editing ? 'Save Changes' : 'Create Coupon'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete Coupon"
        description={`Delete coupon "${deleteTarget?.code}"? Customers with this code will no longer be able to use it.`}
        confirmLabel="Delete"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  )
}
