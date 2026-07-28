import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Ticket } from 'lucide-react'
import { couponsService } from '@/services/api/coupons.service'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { Pagination } from '@/components/ui/Pagination'
import { Badge } from '@/components/ui/Badge'
import { IconButton } from '@/components/ui/IconButton'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Modal } from '@/components/ui/Modal'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useDebounce } from '@/utils/useDebounce'
import { useToast } from '@/contexts/ToastContext'
import { formatDate } from '@/utils/format'
import type { Coupon } from '@/types/models'

const DEFAULT_FORM = { code: '', discount_type: 'PERCENTAGE', discount_value: '', min_order_amount: '', max_discount_amount: '', valid_from: '', valid_to: '', is_active: true }

export function CouponsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [editTarget, setEditTarget] = useState<Coupon | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(DEFAULT_FORM)
  const debouncedSearch = useDebounce(search)
  const { toast } = useToast()
  const qc = useQueryClient()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-coupons', page, debouncedSearch],
    queryFn: () => couponsService.listCoupons({ page, search: debouncedSearch }),
  })

  const createMutation = useMutation({
    mutationFn: () => couponsService.createCoupon({
      code: form.code, discount_type: form.discount_type as 'PERCENTAGE' | 'FIXED',
      discount_value: parseFloat(form.discount_value),
      min_order_amount: form.min_order_amount ? parseFloat(form.min_order_amount) : undefined,
      max_discount_amount: form.max_discount_amount ? parseFloat(form.max_discount_amount) : undefined,
      valid_from: form.valid_from || undefined, valid_to: form.valid_to || undefined,
      is_active: form.is_active,
    }),
    onSuccess: () => {
      toast({ title: 'Coupon created', variant: 'success' })
      void qc.invalidateQueries({ queryKey: ['admin-coupons'] })
      setShowCreate(false); setForm(DEFAULT_FORM)
    },
    onError: () => toast({ title: 'Failed to create coupon', variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (pk: string) => couponsService.deleteCoupon(pk),
    onSuccess: () => {
      toast({ title: 'Coupon deleted', variant: 'success' })
      void qc.invalidateQueries({ queryKey: ['admin-coupons'] })
      setDeleteTarget(null)
    },
    onError: () => toast({ title: 'Failed to delete coupon', variant: 'destructive' }),
  })

  const columns: Column<Coupon>[] = [
    {
      key: 'code', header: 'Code',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-bg-subtle"><Ticket className="h-4 w-4 text-text-muted" /></div>
          <span className="font-mono font-medium text-text-primary">{row.code}</span>
        </div>
      ),
    },
    { key: 'type', header: 'Type', render: (row) => <span className="text-text-secondary">{row.discount_type}</span> },
    { key: 'value', header: 'Value', align: 'right', render: (row) => <span className="font-medium text-text-primary">{row.discount_type === 'PERCENTAGE' ? `${row.discount_value}%` : `$${row.discount_value}`}</span> },
    { key: 'uses', header: 'Uses', align: 'right', render: (row) => <span className="text-text-muted">{row.times_used ?? 0}{row.max_uses ? ` / ${row.max_uses}` : ''}</span> },
    { key: 'status', header: 'Status', render: (row) => <Badge variant={row.is_active ? 'success' : 'default'}>{row.is_active ? 'Active' : 'Inactive'}</Badge> },
    { key: 'expiry', header: 'Expires', render: (row) => <span className="text-text-muted">{row.valid_to ? formatDate(row.valid_to) : '—'}</span> },
    {
      key: 'actions', header: '', width: '80px', align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <IconButton icon={<Pencil />} label="Edit" size="sm" onClick={() => setEditTarget(row)} />
          <IconButton icon={<Trash2 />} label="Delete" size="sm" className="text-danger hover:bg-danger-subtle" onClick={() => setDeleteTarget(row)} />
        </div>
      ),
    },
  ]

  const totalPages = Math.ceil((data?.count ?? 0) / 20)

  const CouponForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Code" required className="col-span-2">
          <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="SUMMER20" />
        </FormField>
        <FormField label="Discount type" required>
          <Select value={form.discount_type} onChange={(e) => setForm((f) => ({ ...f, discount_type: e.target.value }))}>
            <option value="PERCENTAGE">Percentage</option>
            <option value="FIXED">Fixed amount</option>
          </Select>
        </FormField>
        <FormField label="Discount value" required>
          <Input type="number" min="0" step="0.01" value={form.discount_value} onChange={(e) => setForm((f) => ({ ...f, discount_value: e.target.value }))} />
        </FormField>
        <FormField label="Min order ($)">
          <Input type="number" min="0" step="0.01" value={form.min_order_amount} onChange={(e) => setForm((f) => ({ ...f, min_order_amount: e.target.value }))} />
        </FormField>
        <FormField label="Max discount ($)">
          <Input type="number" min="0" step="0.01" value={form.max_discount_amount} onChange={(e) => setForm((f) => ({ ...f, max_discount_amount: e.target.value }))} />
        </FormField>
        <FormField label="Valid from">
          <Input type="date" value={form.valid_from} onChange={(e) => setForm((f) => ({ ...f, valid_from: e.target.value }))} />
        </FormField>
        <FormField label="Valid to">
          <Input type="date" value={form.valid_to} onChange={(e) => setForm((f) => ({ ...f, valid_to: e.target.value }))} />
        </FormField>
      </div>
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={() => { setShowCreate(false); setEditTarget(null) }}>Cancel</Button>
        <Button isLoading={createMutation.isPending} onClick={() => createMutation.mutate()} disabled={!form.code || !form.discount_value}>
          {showCreate ? 'Create' : 'Save'}
        </Button>
      </div>
    </div>
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Coupons</h1>
          <p className="text-sm text-text-muted">{data?.count ?? 0} coupons</p>
        </div>
        <Button onClick={() => { setShowCreate(true); setForm(DEFAULT_FORM) }}><Plus className="h-4 w-4" /> Add coupon</Button>
      </div>

      <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search by code…" className="w-64" />

      <div className="admin-surface overflow-hidden">
        <DataTable columns={columns} data={data?.results ?? []} isLoading={isLoading} error={error ? 'Failed to load coupons.' : null} onRetry={refetch} rowKey={(r) => r.code} emptyTitle="No coupons" />
        {totalPages > 1 && <div className="flex justify-end border-t border-border p-4"><Pagination page={page} totalPages={totalPages} onPageChange={setPage} /></div>}
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New coupon" size="md"><CouponForm /></Modal>
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit coupon" size="md"><CouponForm /></Modal>
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && deleteMutation.mutate(String(deleteTarget.id))} title="Delete coupon?" description={`Code "${deleteTarget?.code}" will be permanently deleted.`} confirmLabel="Delete" isLoading={deleteMutation.isPending} />
    </div>
  )
}
