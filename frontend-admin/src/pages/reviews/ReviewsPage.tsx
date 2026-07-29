import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Star, Check, X, Trash2 } from 'lucide-react'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SearchBar } from '@/components/ui/SearchBar'
import { Pagination } from '@/components/ui/Pagination'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Tabs } from '@/components/ui/Tabs'
import { reviewsService } from '@/services/api/reviews.service'
import { useToast } from '@/contexts/ToastContext'
import { formatDate, truncate } from '@/utils/format'
import type { Review } from '@/types/models'
import type { ApiError } from '@/types/api'

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i < rating ? 'fill-warning text-warning' : 'fill-border text-border'}`}
          aria-hidden
        />
      ))}
    </span>
  )
}

const TABS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'all', label: 'All' },
]

const PAGE_SIZE = 20

export function ReviewsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('pending')
  const [deleteTarget, setDeleteTarget] = useState<Review | null>(null)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const isApproved =
    tab === 'pending' ? false : tab === 'approved' ? true : undefined

  const { data, isLoading } = useQuery({
    queryKey: ['admin-reviews', page, search, tab],
    queryFn: () =>
      reviewsService.listReviews({
        page,
        page_size: PAGE_SIZE,
        search: search || undefined,
        is_approved: isApproved,
      }),
  })

  // Fetch counts for tab badges
  const { data: pendingMeta } = useQuery({
    queryKey: ['admin-reviews-count', 'pending'],
    queryFn: () => reviewsService.listReviews({ page: 1, page_size: 1, is_approved: false }),
    staleTime: 30_000,
  })
  const { data: approvedMeta } = useQuery({
    queryKey: ['admin-reviews-count', 'approved'],
    queryFn: () => reviewsService.listReviews({ page: 1, page_size: 1, is_approved: true }),
    staleTime: 30_000,
  })
  const { data: allMeta } = useQuery({
    queryKey: ['admin-reviews-count', 'all'],
    queryFn: () => reviewsService.listReviews({ page: 1, page_size: 1 }),
    staleTime: 30_000,
  })

  const tabCounts: Record<string, number | undefined> = {
    pending: pendingMeta?.count,
    approved: approvedMeta?.count,
    all: allMeta?.count,
  }

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-reviews'] })
  }

  const approveMutation = useMutation({
    mutationFn: (id: string) => reviewsService.approveReview(id),
    onSuccess: () => { invalidate(); toast({ title: 'Review approved', variant: 'success' }) },
    onError: (e: ApiError) => toast({ title: e.message, variant: 'destructive' }),
  })

  const rejectMutation = useMutation({
    mutationFn: (id: string) => reviewsService.rejectReview(id),
    onSuccess: () => { invalidate(); toast({ title: 'Review rejected', variant: 'success' }) },
    onError: (e: ApiError) => toast({ title: e.message, variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => reviewsService.deleteReview(id),
    onSuccess: () => {
      invalidate()
      toast({ title: 'Review deleted', variant: 'success' })
      setDeleteTarget(null)
    },
    onError: (e: ApiError) => toast({ title: e.message, variant: 'destructive' }),
  })

  const totalPages = Math.ceil((data?.count ?? 0) / PAGE_SIZE)

  const columns: Column<Review>[] = [
    {
      key: 'rating',
      header: 'Rating',
      width: '112px',
      render: (r) => <StarRating rating={r.rating} />,
    },
    {
      key: 'review',
      header: 'Review',
      render: (r) => (
        <div>
          {r.title && <p className="font-medium text-text-primary">{r.title}</p>}
          <p className="mt-0.5 text-xs text-text-secondary">{truncate(r.body, 80)}</p>
        </div>
      ),
    },
    {
      key: 'product',
      header: 'Product',
      render: (r) => <span className="text-sm text-text-secondary">{r.product_name ?? '—'}</span>,
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (r) => <span className="text-sm text-text-secondary">{r.user_email ?? 'Anonymous'}</span>,
    },
    {
      key: 'verified',
      header: 'Verified',
      render: (r) => (
        <Badge variant={r.is_verified_purchase ? 'success' : 'secondary'}>
          {r.is_verified_purchase ? 'Verified' : 'Unverified'}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <Badge variant={r.is_approved ? 'success' : 'warning'}>
          {r.is_approved ? 'Approved' : 'Pending'}
        </Badge>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      render: (r) => <span className="text-sm text-text-muted">{formatDate(r.created_at)}</span>,
    },
    {
      key: 'actions',
      header: '',
      width: '100px',
      align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end gap-1">
          {!r.is_approved && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-success hover:bg-success-subtle"
              aria-label="Approve"
              onClick={(e) => { e.stopPropagation(); approveMutation.mutate(String(r.id)) }}
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
          )}
          {r.is_approved && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-warning hover:bg-warning-subtle"
              aria-label="Reject"
              onClick={(e) => { e.stopPropagation(); rejectMutation.mutate(String(r.id)) }}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-danger hover:bg-danger-subtle"
            aria-label="Delete"
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(r) }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-text-primary">Reviews</h1>
        <p className="mt-0.5 text-sm text-text-secondary">
          Moderate customer product reviews
        </p>
      </div>

      <Card padding="none">
        <div className="border-b border-border">
          <Tabs
            tabs={TABS.map((t) => ({ ...t, count: tabCounts[t.value] }))}
            value={tab}
            onValueChange={(v) => { setTab(v); setPage(1) }}
            className="px-4"
          />
        </div>

        <div className="flex items-center gap-3 border-b border-border p-4">
          <SearchBar
            value={search}
            onChange={(v) => { setSearch(v); setPage(1) }}
            placeholder="Search by email or product…"
            className="w-full max-w-xs"
          />
        </div>

        <DataTable
          columns={columns}
          data={data?.results ?? []}
          isLoading={isLoading}
          rowKey={(r) => r.id}
          emptyTitle={tab === 'pending' ? 'No pending reviews' : 'No reviews found'}
          emptyDescription={tab === 'pending' ? 'All reviews have been moderated.' : undefined}
        />

        {totalPages > 1 && (
          <div className="border-t border-border px-4 py-4">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(String(deleteTarget.id))}
        title="Delete Review"
        description={`Delete "${deleteTarget?.title ?? 'this review'}"? This cannot be undone.`}
        confirmLabel="Delete Review"
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
