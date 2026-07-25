import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/utils/cn'

interface PaginationProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  className?: string
}

export function Pagination({ page, pageSize, total, onPageChange, className }: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      <p className="text-body-sm text-text-secondary">
        Showing <span className="font-medium text-text-primary">{from}–{to}</span> of{' '}
        <span className="font-medium text-text-primary">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-md transition-colors',
            'text-text-secondary hover:bg-bg-subtle hover:text-text-primary',
            'disabled:cursor-not-allowed disabled:opacity-40'
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
          let pageNum: number
          if (totalPages <= 7) {
            pageNum = i + 1
          } else if (page <= 4) {
            pageNum = i + 1 === 7 ? totalPages : i + 1
          } else if (page >= totalPages - 3) {
            pageNum = i === 0 ? 1 : totalPages - 6 + i
          } else {
            const map = [1, page - 2, page - 1, page, page + 1, page + 2, totalPages]
            pageNum = map[i]
          }
          const showEllipsis =
            totalPages > 7 &&
            ((i === 1 && pageNum > 2) || (i === 5 && pageNum < totalPages - 1))

          return showEllipsis ? (
            <span key={`ellipsis-${i}`} className="flex h-9 w-9 items-center justify-center text-text-muted">
              …
            </span>
          ) : (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              aria-label={`Page ${pageNum}`}
              aria-current={pageNum === page ? 'page' : undefined}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-md text-body-sm font-medium transition-colors',
                pageNum === page
                  ? 'bg-primary text-primary-foreground'
                  : 'text-text-secondary hover:bg-bg-subtle hover:text-text-primary'
              )}
            >
              {pageNum}
            </button>
          )
        })}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-md transition-colors',
            'text-text-secondary hover:bg-bg-subtle hover:text-text-primary',
            'disabled:cursor-not-allowed disabled:opacity-40'
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
