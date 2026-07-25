import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Package, Plus } from 'lucide-react'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { SearchBar } from '@/components/ui/SearchBar'
import { Pagination } from '@/components/ui/Pagination'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { catalogService } from '@/services/api/catalog.service'
import { useToast } from '@/contexts/ToastContext'
import { formatCurrency } from '@/utils/format'
import type { Product, ProductStatus } from '@/types/models'
import type { ApiError } from '@/types/api'

const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  sku: z.string().optional(),
  base_price: z.string().min(1, 'Price is required'),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']),
  is_featured: z.boolean().default(false),
  description: z.string().optional(),
  short_description: z.string().optional(),
})

type ProductFormData = z.infer<typeof productSchema>

type StatusVariant = 'secondary' | 'success' | 'danger'
const statusConfig: Record<ProductStatus, { label: string; variant: StatusVariant }> = {
  DRAFT: { label: 'Draft', variant: 'secondary' },
  ACTIVE: { label: 'Active', variant: 'success' },
  ARCHIVED: { label: 'Archived', variant: 'danger' },
}

export function ProductsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products', page, search],
    queryFn: () => catalogService.getProducts({ page, page_size: 20, search: search || undefined }),
  })

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: { name: '', base_price: '', status: 'DRAFT', is_featured: false },
  })

  const createMutation = useMutation({
    mutationFn: (d: ProductFormData) => catalogService.createProduct(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      toast({ title: 'Product created', variant: 'success' })
      setAddOpen(false)
      form.reset()
    },
    onError: (e: ApiError) => toast({ title: e.message, variant: 'error' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (slug: string) => catalogService.deleteProduct(slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      toast({ title: 'Product deleted', variant: 'success' })
      setDeleteTarget(null)
    },
    onError: (e: ApiError) => toast({ title: e.message, variant: 'error' }),
  })

  const columns: Column<Product>[] = [
    {
      key: 'image',
      header: 'Image',
      headerClassName: 'w-14',
      cell: (p) => {
        const img = p.images?.[0]?.image
        return img ? (
          <img src={img} alt={p.name} className="h-10 w-10 rounded-md object-cover" />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-bg-subtle">
            <Package className="h-5 w-5 text-text-muted" aria-hidden />
          </div>
        )
      },
    },
    {
      key: 'name',
      header: 'Product',
      cell: (p) => (
        <div>
          <p className="font-medium text-text-primary">{p.name}</p>
          {p.sku && <p className="font-mono text-caption text-text-muted">{p.sku}</p>}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (p) => {
        const cfg = statusConfig[p.status] ?? { label: p.status, variant: 'secondary' as StatusVariant }
        return <Badge variant={cfg.variant}>{cfg.label}</Badge>
      },
    },
    {
      key: 'price',
      header: 'Price',
      cell: (p) => (
        <span className="font-medium text-text-primary">{formatCurrency(p.base_price)}</span>
      ),
    },
    {
      key: 'featured',
      header: 'Featured',
      cell: (p) => (
        <span className={p.is_featured ? 'text-success' : 'text-text-muted'}>
          {p.is_featured ? '✓' : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      headerClassName: 'w-24',
      cell: (p) => (
        <Button
          variant="ghost"
          size="sm"
          className="text-danger hover:bg-danger-subtle hover:text-danger"
          onClick={(e) => { e.stopPropagation(); setDeleteTarget(p) }}
        >
          Delete
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-heading-lg font-bold text-text-primary">Products</h1>
          <p className="mt-0.5 text-body-sm text-text-secondary">
            {data?.count ?? 0} products in your catalog
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} size="sm">
          <Plus className="h-4 w-4" aria-hidden /> Add Product
        </Button>
      </div>

      <Card noPadding>
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <SearchBar
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            onClear={() => { setSearch(''); setPage(1) }}
            placeholder="Search products…"
            containerClassName="w-full max-w-xs"
          />
        </div>
        <DataTable
          columns={columns}
          data={data?.results ?? []}
          isLoading={isLoading}
          keyExtractor={(p) => p.id}
          emptyIcon={Package}
          emptyTitle="No products found"
          emptyDescription="Add your first product to get started."
        />
        {data && data.count > 20 && (
          <div className="border-t border-border px-4 py-4">
            <Pagination page={page} pageSize={20} total={data.count} onPageChange={setPage} />
          </div>
        )}
      </Card>

      {/* Add modal */}
      <Modal open={addOpen} onOpenChange={setAddOpen} title="Add Product" size="lg">
        <form onSubmit={form.handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Product Name" required error={form.formState.errors.name?.message}>
              {(id, errorId) => (
                <Input id={id} errorId={errorId} error={!!form.formState.errors.name} placeholder="e.g. Blue T-Shirt" {...form.register('name')} />
              )}
            </FormField>
            <FormField label="SKU" error={form.formState.errors.sku?.message}>
              {(id, errorId) => (
                <Input id={id} errorId={errorId} placeholder="e.g. SKU-001" {...form.register('sku')} />
              )}
            </FormField>
            <FormField label="Base Price" required error={form.formState.errors.base_price?.message}>
              {(id, errorId) => (
                <Input id={id} errorId={errorId} error={!!form.formState.errors.base_price} type="number" step="0.01" placeholder="0.00" {...form.register('base_price')} />
              )}
            </FormField>
            <FormField label="Status" required error={form.formState.errors.status?.message}>
              {(id) => (
                <Select id={id} {...form.register('status')}>
                  <option value="DRAFT">Draft</option>
                  <option value="ACTIVE">Active</option>
                  <option value="ARCHIVED">Archived</option>
                </Select>
              )}
            </FormField>
          </div>
          <FormField label="Short Description">
            {(id) => (
              <Input id={id} placeholder="One-line summary" {...form.register('short_description')} />
            )}
          </FormField>
          <FormField label="Description">
            {(id) => (
              <Textarea id={id} placeholder="Full product description…" rows={4} {...form.register('description')} />
            )}
          </FormField>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_featured" {...form.register('is_featured')} className="h-4 w-4 rounded border-border accent-primary" />
            <label htmlFor="is_featured" className="text-body-sm font-medium text-text-primary">
              Featured product
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm" isLoading={createMutation.isPending} loadingText="Creating…">Create Product</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete Product"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete Product"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.slug)}
      />
    </div>
  )
}
