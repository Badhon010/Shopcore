import { useState } from 'react'
import { ThumbsUp } from 'lucide-react'
import { formatRelativeDate } from '@/utils/formatDate'
import { RatingStars } from '@/components/ui/RatingStars'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Pagination } from '@/components/ui/Pagination'
import { Spinner } from '@/components/feedback/Spinner'
import { EmptyState } from '@/components/feedback/EmptyState'
import { useReviews } from '../hooks/useProducts'
import { MessageSquare } from 'lucide-react'

interface ReviewListProps {
  productSlug: string
}

export function ReviewList({ productSlug }: ReviewListProps) {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useReviews(productSlug, page)

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    )
  }

  if (!data?.results.length) {
    return (
      <EmptyState
        icon={<MessageSquare className="h-8 w-8" />}
        title="No reviews yet"
        description="Be the first to review this product."
      />
    )
  }

  const totalPages = Math.ceil((data?.count ?? 0) / 10)

  return (
    <div className="space-y-6">
      {data.results.map((review) => (
        <article key={review.id} className="border-b border-border pb-6 last:border-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Avatar
                fallback={review.user.full_name}
                src={review.user.avatar}
                size="sm"
              />
              <div>
                <p className="text-body-sm font-medium text-text-primary">{review.user.full_name}</p>
                <p className="text-caption text-text-tertiary">{formatRelativeDate(review.created_at)}</p>
              </div>
            </div>
            <RatingStars rating={review.rating} size="sm" />
          </div>

          {review.title && (
            <p className="mt-3 text-body-sm font-semibold text-text-primary">{review.title}</p>
          )}
          <p className="mt-2 text-body-sm text-text-secondary">{review.body}</p>

          <div className="mt-3 flex items-center gap-3">
            {review.is_verified_purchase && (
              <Badge variant="success">Verified Purchase</Badge>
            )}
            <button
              className="flex items-center gap-1 text-caption text-text-tertiary transition-colors hover:text-text-secondary focus-visible:outline-none"
              aria-label={`Mark review as helpful (${review.helpful_count} found this helpful)`}
            >
              <ThumbsUp className="h-3 w-3" />
              <span>Helpful ({review.helpful_count})</span>
            </button>
          </div>
        </article>
      ))}

      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  )
}
