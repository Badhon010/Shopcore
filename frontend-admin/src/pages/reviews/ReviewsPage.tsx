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
    <span className="flex items-center gap-0.5 text-warning" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < rating ? 'text-warning' : 'text-border'} aria-hidden>★</span>
      ))}
    </span>
  )
}

const TABS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'all', label: 'All' },
]

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
      reviewsService.getReviews({
        page,
        page_size: 20,
        search: search || undefined,
        is_approved: isApproved,
      }),
  })

  const invalidate = () => { void queryClient.invalidateQueries({ queryKey: ['admin-reviews'] }) }

  const approveMutation = useMutation({
    mutationFn: (id: number) => reviewsService.approveReview(id),
    onSuccess: () => { invalidate(); toast({ title: 'Review approved', variant: 'success' }) },
    onError: (e: ApiError) => toast({ title: e.message, variant: 'error' }),
  })

  const rejectMutation = useMutation({
    mutationFn: (id: number) => reviewsService.rejectReview(id),
    onSuccess: () => { invalidate(); toast({ title: 'Review rejected', variant: 'success' }) },
    onError: (e: ApiError) => toast({ title: e.message, variant: 'error' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => reviewsService.deleteReview(id),
    onSuccess: () => {
      invalidate()
      toast({ title: 'Review deleted', variant: 'success' })
      setDeleteTarget(null)
    },
    onError: (e: ApiError) => toast({ title: e.message, variant: 'error' }),
  })

  const columns: Column<Review>[] = [
    {
      key: 'rating',
      header: 'Rating',
      headerClassName: 'w-28',
      cell: (r) => <StarRating rating={r.rating} />,
    },
    {
      key: 'review',
      header: 'Review',
      cell: (r) => (
        <div>
          <p className="font-medium text-text-primary">{r.title}</p>
          <p className="mt-0.5 text-caption text-text-secondary">{truncate(r.body, 80)}</p>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      cell: (r) => <span className="text-body-sm text-text-secondary">{r.user_email}</span>,
    },
    {
      key: 'verified',
      header: 'Verified',
      cell: (r) => (
        <Badge variant={r.is_verified_purchase ? 'success' : 'secondary'} size="sm">
          {r.is_verified_purchase ? 'Verified' : 'Unverified'}
        </Badge>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      cell: (r) => <span className="text-body-sm text-text-muted">{formatDate(r.created_at)}</span>,
    },
    {
      key: 'actions',
      header: '',
      headerClassName: 'w-32',
      cell: (r) => (
        <div className="flex items-center gap-1">
          {!r.is_approved && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-success hover:bg-success-subtle hover:text-success"
              aria-label="Approve"
              onClick={(e) => { e.stopPropagation(); approveMutation.mutate(r.id) }}
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
          )}
          {r.is_approved && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-warning hover:bg-warning-subtle hover:text-warning"
              aria-label="Reject"
              onClick={(e) => { e.stopPropagation(); rejectMutation.mutate(r.id) }}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-danger hover:bg-danger-subtle hover:text-danger"
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
        <h1 className="text-heading-lg font-bold text-text-primary">Reviews</h1>
        <p className="mt-0.5 text-body-sm text-text-secondary">
          Moderate customer product reviews
        </p>
      </div>

      <Card noPadding>
        <div className="border-b border-border">
          <Tabs
            tabs={TABS.map((t) => ({
              ...t,
              count: t.value === tab ? data?.count : undefined,
            }))}
            value={tab}
            onChange={(v) => { setTab(v); setPage(1) }}
            className="px-4"
          />
        </div>
        <div className="flex items-center gap-3 border-b border-border p-4">
          <SearchBar
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            onClear={() => { setSearch(''); setPage(1) }}
            placeholder="Search by email or product…"
            containerClassName="w-full max-w-xs"
          />
        </div>
        <DataTable
          columns={columns}
          data={data?.results ?? []}
          isLoading={isLoading}
          keyExtractor={(r) => r.id}
          emptyIcon={Star}
          emptyTitle={tab === 'pending' ? 'No pending reviews' : 'No reviews found'}
          emptyDescription={tab === 'pending' ? 'All reviews have been moderated.' : undefined}
        />
        {data && data.count > 20 && (
          <div className="border-t border-border px-4 py-4">
            <Pagination page={page} pageSize={20} total={data.count} onPageChange={setPage} />
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete Review"
        description={`Delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmLabel="Delete Review"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  )
}
