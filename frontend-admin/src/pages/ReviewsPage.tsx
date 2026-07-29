import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, X, Trash2, Star } from 'lucide-react'
import { reviewsService } from '@/services/api/reviews.service'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { SearchBar } from '@/components/ui/SearchBar'
import { Pagination } from '@/components/ui/Pagination'
import { Badge } from '@/components/ui/Badge'
import { IconButton } from '@/components/ui/IconButton'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Select } from '@/components/ui/Select'
import { useDebounce } from '@/utils/useDebounce'
import { useToast } from '@/contexts/ToastContext'
import { formatDate } from '@/utils/format'
import type { Review } from '@/types/models'

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`h-3.5 w-3.5 ${i < rating ? 'fill-warning text-warning' : 'text-border'}`} />
      ))}
    </div>
  )
}

export function ReviewsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [approvedFilter, setApprovedFilter] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Review | null>(null)
  const debouncedSearch = useDebounce(search)
  const { toast } = useToast()
  const qc = useQueryClient()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-reviews', page, debouncedSearch, approvedFilter],
    queryFn: () => reviewsService.listReviews({
      page, search: debouncedSearch,
      is_approved: approvedFilter === '' ? undefined : approvedFilter === 'true',
    }),
  })

  const approveMutation = useMutation({
    mutationFn: (pk: string) => reviewsService.approveReview(pk),
    onSuccess: () => { toast({ title: 'Review approved', variant: 'success' }); void qc.invalidateQueries({ queryKey: ['admin-reviews'] }) },
    onError: () => toast({ title: 'Action failed', variant: 'destructive' }),
  })

  const rejectMutation = useMutation({
    mutationFn: (pk: string) => reviewsService.rejectReview(pk),
    onSuccess: () => { toast({ title: 'Review hidden', variant: 'default' }); void qc.invalidateQueries({ queryKey: ['admin-reviews'] }) },
    onError: () => toast({ title: 'Action failed', variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (pk: string) => reviewsService.deleteReview(pk),
    onSuccess: () => { toast({ title: 'Review deleted', variant: 'success' }); void qc.invalidateQueries({ queryKey: ['admin-reviews'] }); setDeleteTarget(null) },
    onError: () => toast({ title: 'Action failed', variant: 'destructive' }),
  })

  const columns: Column<Review>[] = [
    {
      key: 'review', header: 'Review',
      render: (row) => (
        <div className="max-w-xs">
          <div className="flex items-center gap-2 mb-1">
            <StarRating rating={row.rating} />
            <span className="text-xs text-text-muted">{row.user_email ?? 'Anonymous'}</span>
          </div>
          {row.body && <p className="text-sm text-text-secondary line-clamp-2">{row.body}</p>}
        </div>
      ),
    },
    { key: 'product', header: 'Product', render: (row) => <span className="text-text-secondary">{row.product_name ?? '—'}</span> },
    { key: 'status', header: 'Status', render: (row) => <Badge variant={row.is_approved ? 'success' : 'warning'}>{row.is_approved ? 'Approved' : 'Pending'}</Badge> },
    { key: 'date', header: 'Date', render: (row) => <span className="text-text-muted">{formatDate(row.created_at)}</span> },
    {
      key: 'actions', header: '', width: '100px', align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          {!row.is_approved && <IconButton icon={<Check />} label="Approve" size="sm" className="text-success hover:bg-success-subtle" onClick={() => approveMutation.mutate(String(row.id))} />}
          {row.is_approved && <IconButton icon={<X />} label="Hide" size="sm" className="text-warning hover:bg-warning-subtle" onClick={() => rejectMutation.mutate(String(row.id))} />}
          <IconButton icon={<Trash2 />} label="Delete" size="sm" className="text-danger hover:bg-danger-subtle" onClick={() => setDeleteTarget(row)} />
        </div>
      ),
    },
  ]

  const totalPages = Math.ceil((data?.count ?? 0) / 20)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-text-primary">Reviews</h1>
        <p className="text-sm text-text-muted">{data?.count ?? 0} reviews</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search reviews…" className="w-64" />
        <Select value={approvedFilter} onChange={(e) => { setApprovedFilter(e.target.value); setPage(1) }} className="w-36">
          <option value="">All reviews</option>
          <option value="true">Approved</option>
          <option value="false">Pending</option>
        </Select>
      </div>

      <div className="admin-surface overflow-hidden">
        <DataTable columns={columns} data={data?.results ?? []} isLoading={isLoading} error={error ? 'Failed to load reviews.' : null} onRetry={refetch} rowKey={(r) => r.id} emptyTitle="No reviews" />
        {totalPages > 1 && <div className="flex justify-end border-t border-border p-4"><Pagination page={page} totalPages={totalPages} onPageChange={setPage} /></div>}
      </div>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && deleteMutation.mutate(String(deleteTarget.id))} title="Delete review?" description="This review will be permanently removed." confirmLabel="Delete" isLoading={deleteMutation.isPending} />
    </div>
  )
}
