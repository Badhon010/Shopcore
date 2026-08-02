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
import { useDebounce } from '@/utils/useDebounce'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/contexts/AuthContext'
import { formatDate, formatCurrency } from '@/utils/format'
import type { Coupon } from '@/types/models'
import type { ApiError } from '@/types/api'

const couponSchema = z.object({
  code:                   z.string().min(1, 'Code is required'),
  discount_type:          z.enum(['PERCENTAGE', 'FIXED']),
  discount_value:         z.string().min(1, 'Discount value is required'),
  minimum_order_amount:   z.string().optional(),
  max_discount_amount:    z.string().optional(),
  valid_from:             z.string().optional(),
  valid_until:            z.string().optional(),
  usage_limit_total:      z.string().optional(),
  usage_limit_per_user:   z.string().optional(),
  is_active:              z.boolean().default(true),
})
type CouponFormData = z.infer<typeof couponSchema>

function toDateInput(iso: string | null | undefined): string {
  if (!iso) return ''
  try { return new Date(iso).toISOString().slice(0, 10) } catch { return '' }
}

const PAGE_SIZE = 20

export function CouponsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Coupon | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null)
  const debouncedSearch = useDebounce(search)
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { isAuthenticated } = useAuth()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-coupons', page, debouncedSearch, activeFilter],
    queryFn: () =>
      couponsService.listCoupons({
        page,
        page_size: PAGE_SIZE,
        search: debouncedSearch || undefined,
        is_active: activeFilter === 'all' ? undefined : activeFilter === 'active',
      }),
    enabled: isAuthenticated,
  })

  const form = useForm<CouponFormData>({
    resolver: zodResolver(couponSchema),
    defaultValues: {
      code: '', discount_type: 'PERCENTAGE', discount_value: '',
      valid_from: '', valid_until: '', is_active: true,
    },
  })

  const openAdd = () => {
    setEditing(null)
    form.reset({
      code: '', discount_type: 'PERCENTAGE', discount_value: '',
      minimum_order_amount: '', max_discount_amount: '',
      valid_from: '', valid_until: '',
      usage_limit_total: '', usage_limit_per_user: '',
      is_active: true,
    })
    setModalOpen(true)
  }

  const openEdit = (c: Coupon) => {
    setEditing(c)
    form.reset({
      code: c.code,
      discount_type: c.discount_type,
      discount_value: c.discount_value,
      minimum_order_amount: c.minimum_order_amount ?? '',
      max_discount_amount: c.max_discount_amount ?? '',
      valid_from: toDateInput(c.valid_from),
      valid_until: toDateInput(c.valid_until),
      usage_limit_total: c.usage_limit_total != null ? String(c.usage_limit_total) : '',
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
        valid_from: d.valid_from || null,
        valid_until: d.valid_until || null,
        minimum_order_amount: d.minimum_order_amount || null,
        max_discount_amount: d.max_discount_amount || null,
        usage_limit_total: d.usage_limit_total ? parseInt(d.usage_limit_total) : null,
        usage_limit_per_user: d.usage_limit_per_user ? parseInt(d.usage_limit_per_user) : null,
      }
      return editing
        ? couponsService.updateCoupon(String(editing.id), payload)
        : couponsService.createCoupon(payload)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-coupons'] })
      toast({ title: editing ? 'Coupon updated' : 'Coupon created', variant: 'success' })
      setModalOpen(false)
    },
    onError: (e: ApiError) => toast({ title: e.message, variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => couponsService.deleteCoupon(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-coupons'] })
      toast({ title: 'Coupon deleted', variant: 'success' })
      setDeleteTarget(null)
    },
    onError: (e: ApiError) => toast({ title: e.message, variant: 'destructive' }),
  })

  const discountType = form.watch('discount_type')
  const totalPages = Math.ceil((data?.count ?? 0) / PAGE_SIZE)

  const columns: Column<Coupon>[] = [
    {
      key: 'code',
      header: 'Code',
      render: (c) => (
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-light">
            <Tag className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="font-mono font-bold text-text-primary">{c.code}</span>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (c) => (
        <Badge variant={c.discount_type === 'PERCENTAGE' ? 'info' : 'success'}>
          {c.discount_type === 'PERCENTAGE' ? '% Off' : 'Fixed'}
        </Badge>
      ),
    },
    {
      key: 'discount',
      header: 'Discount',
      render: (c) =>
        c.discount_type === 'PERCENTAGE'
          ? <span className="font-medium text-text-primary">{c.discount_value}%</span>
          : <span className="font-medium text-text-primary">{formatCurrency(c.discount_value)}</span>,
    },
    {
      key: 'validity',
      header: 'Valid',
      render: (c) => (
        <span className="text-sm text-text-secondary">
          {c.valid_from ? formatDate(c.valid_from) : '—'}
          {c.valid_until ? ` → ${formatDate(c.valid_until)}` : ''}
        </span>
      ),
    },
    {
      key: 'usage',
      header: 'Usage',
      render: (c) => (
        <span className="font-mono text-sm text-text-secondary">
          {c.times_used}/{c.usage_limit_total ?? '∞'}
        </span>
      ),
    },
    {
      key: 'active',
      header: 'Status',
      render: (c) => (
        <Badge variant={c.is_active ? 'success' : 'secondary'}>
          {c.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '80px',
      align: 'right',
      render: (c) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Edit"
            onClick={(e) => { e.stopPropagation(); openEdit(c) }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Delete"
            className="text-danger hover:bg-danger-subtle"
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(c) }}
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
          <h1 className="text-lg font-bold text-text-primary">Coupons</h1>
          <p className="mt-0.5 text-sm text-text-secondary">{data?.count ?? 0} discount codes</p>
        </div>
        <Button onClick={openAdd} size="sm">
          <Plus className="h-4 w-4" /> Create Coupon
        </Button>
      </div>

      <Card padding="none">
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <SearchBar
            value={search}
            onChange={(v) => { setSearch(v); setPage(1) }}
            placeholder="Search codes…"
            className="w-full max-w-xs"
          />
          <Select
            value={activeFilter}
            onChange={(e) => { setActiveFilter(e.target.value); setPage(1) }}
            className="w-40"
          >
            <option value="all">All coupons</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </Select>
        </div>

        <DataTable
          columns={columns}
          data={data?.results ?? []}
          isLoading={isLoading}
          rowKey={(c) => c.id}
          emptyTitle="No coupons yet"
          emptyDescription="Create discount codes for your customers."
        />

        {totalPages > 1 && (
          <div className="border-t border-border px-4 py-4">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </Card>

      {/* Create / Edit modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Coupon' : 'Create Coupon'}
        size="lg"
      >
        <form onSubmit={form.handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              label="Code"
              htmlFor="coupon-code"
              required
              error={form.formState.errors.code?.message}
            >
              <Input
                id="coupon-code"
                placeholder="SUMMER20"
                className="uppercase"
                readOnly={!!editing}
                {...form.register('code')}
              />
            </FormField>

            <FormField label="Type" htmlFor="coupon-type" required>
              <Select id="coupon-type" {...form.register('discount_type')}>
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED">Fixed Amount ($)</option>
              </Select>
            </FormField>

            <FormField
              label={discountType === 'PERCENTAGE' ? 'Discount (%)' : 'Discount Amount ($)'}
              htmlFor="coupon-value"
              required
              error={form.formState.errors.discount_value?.message}
            >
              <Input
                id="coupon-value"
                type="number"
                step="0.01"
                min="0"
                placeholder={discountType === 'PERCENTAGE' ? '15' : '10.00'}
                {...form.register('discount_value')}
              />
            </FormField>

            <FormField label="Min. Order Amount ($)" htmlFor="coupon-min">
              <Input
                id="coupon-min"
                type="number"
                step="0.01"
                min="0"
                placeholder="Optional"
                {...form.register('minimum_order_amount')}
              />
            </FormField>

            {discountType === 'PERCENTAGE' && (
              <FormField label="Max. Discount Cap ($)" htmlFor="coupon-cap">
                <Input
                  id="coupon-cap"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Optional"
                  {...form.register('max_discount_amount')}
                />
              </FormField>
            )}

            <FormField
              label="Total Usage Limit"
              htmlFor="coupon-limit-total"
              hint="Leave blank for unlimited"
            >
              <Input
                id="coupon-limit-total"
                type="number"
                min="1"
                placeholder="Unlimited"
                {...form.register('usage_limit_total')}
              />
            </FormField>

            <FormField
              label="Per-Customer Limit"
              htmlFor="coupon-limit-per-user"
              hint="Max uses per individual customer"
            >
              <Input
                id="coupon-limit-per-user"
                type="number"
                min="1"
                placeholder="Unlimited"
                {...form.register('usage_limit_per_user')}
              />
            </FormField>

            <FormField label="Valid From" htmlFor="coupon-valid-from">
              <Input
                id="coupon-valid-from"
                type="date"
                {...form.register('valid_from')}
              />
            </FormField>

            <FormField label="Valid Until" htmlFor="coupon-valid-until">
              <Input
                id="coupon-valid-until"
                type="date"
                {...form.register('valid_until')}
              />
            </FormField>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="coupon-active"
              {...form.register('is_active')}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            <label htmlFor="coupon-active" className="text-sm font-medium text-text-primary">
              Active
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={saveMutation.isPending}
              loadingText="Saving…"
            >
              {editing ? 'Save Changes' : 'Create Coupon'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(String(deleteTarget.id))}
        title="Delete Coupon"
        description={`Delete coupon "${deleteTarget?.code}"? Customers with this code will no longer be able to use it.`}
        confirmLabel="Delete"
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
