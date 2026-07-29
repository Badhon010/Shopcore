import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, Package } from 'lucide-react'
import { catalogService } from '@/services/api/catalog.service'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { Pagination } from '@/components/ui/Pagination'
import { Badge } from '@/components/ui/Badge'
import { IconButton } from '@/components/ui/IconButton'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Select } from '@/components/ui/Select'
import { useDebounce } from '@/utils/useDebounce'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatDate } from '@/utils/format'
import { ROUTES } from '@/constants/routes'
import type { AdminProduct } from '@/types/models'

const STATUS_VARIANT = {
  PUBLISHED: 'success',
  DRAFT: 'warning',
  ARCHIVED: 'default',
} as const

export function ProductsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<AdminProduct | null>(null)
  const debouncedSearch = useDebounce(search)
  const navigate = useNavigate()
  const { toast } = useToast()
  const qc = useQueryClient()
  const { isAuthenticated } = useAuth()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-products', page, debouncedSearch, statusFilter],
    queryFn: () => catalogService.listProducts({ page, search: debouncedSearch, status: statusFilter || undefined }),
    enabled: isAuthenticated,
  })

  const deleteMutation = useMutation({
    mutationFn: (slug: string) => catalogService.deleteProduct(slug),
    onSuccess: () => {
      toast({ title: 'Product deleted', variant: 'success' })
      void qc.invalidateQueries({ queryKey: ['admin-products'] })
      setDeleteTarget(null)
    },
    onError: () => toast({ title: 'Failed to delete product', variant: 'destructive' }),
  })

  const columns: Column<AdminProduct>[] = [
    {
      key: 'name',
      header: 'Product',
      render: (row) => {
        const imgSrc = row.primary_image?.url ?? row.primary_image?.image ?? row.images?.[0]?.url ?? row.images?.[0]?.image
        return (
          <div className="flex items-center gap-3">
            {imgSrc ? (
              <img src={imgSrc} alt={row.name} className="h-9 w-9 rounded-lg object-cover border border-border" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-bg-subtle"><Package className="h-4 w-4 text-text-muted" /></div>
            )}
            <div>
              <p className="font-medium text-text-primary">{row.name}</p>
              <p className="text-xs text-text-muted">{row.slug}</p>
            </div>
          </div>
        )
      },
    },
    { key: 'category', header: 'Category', render: (row) => <span className="text-text-secondary">{row.category_name ?? '—'}</span> },
    { key: 'price', header: 'Price', align: 'right', render: (row) => formatCurrency(row.base_price ?? row.price ?? '0') },
    {
      key: 'status', header: 'Status',
      render: (row) => <Badge variant={STATUS_VARIANT[row.status as keyof typeof STATUS_VARIANT] ?? 'default'}>{row.status}</Badge>,
    },
    { key: 'created', header: 'Created', render: (row) => <span className="text-text-muted">{formatDate(row.created_at)}</span> },
    {
      key: 'actions', header: '', width: '80px', align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <IconButton icon={<Pencil />} label="Edit" size="sm" onClick={() => navigate(ROUTES.PRODUCT_DETAIL(row.slug))} />
          <IconButton icon={<Trash2 />} label="Delete" size="sm" className="text-danger hover:bg-danger-subtle" onClick={() => setDeleteTarget(row)} />
        </div>
      ),
    },
  ]

  const totalPages = Math.ceil((data?.count ?? 0) / 20)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Products</h1>
          <p className="text-sm text-text-muted">{data?.count ?? 0} total products</p>
        </div>
        <Button onClick={() => navigate('/catalog/products/new')}>
          <Plus className="h-4 w-4" /> Add product
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search products…" className="w-64" />
        <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }} className="w-36">
          <option value="">All statuses</option>
          <option value="PUBLISHED">Published</option>
          <option value="DRAFT">Draft</option>
          <option value="ARCHIVED">Archived</option>
        </Select>
      </div>

      <div className="admin-surface overflow-hidden">
        <DataTable
          columns={columns}
          data={data?.results ?? []}
          isLoading={isLoading}
          error={error ? 'Failed to load products.' : null}
          onRetry={refetch}
          rowKey={(r) => r.slug}
          emptyTitle="No products found"
          emptyDescription="Try adjusting your search or filters."
          emptyAction={{ label: 'Add product', onClick: () => navigate('/catalog/products/new') }}
        />
        {totalPages > 1 && (
          <div className="flex justify-end border-t border-border p-4">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.slug)}
        title="Delete product?"
        description={`"${deleteTarget?.name}" will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete"
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
