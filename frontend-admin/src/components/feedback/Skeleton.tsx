import { cn } from '@/utils/cn'

interface SkeletonProps {
  className?: string
  /** Number of rows to render (for table skeletons) */
  rows?: number
  height?: string
}

export function Skeleton({ className, rows, height }: SkeletonProps) {
  if (rows) {
    return (
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className={cn('skeleton h-10 w-full rounded-lg', className)}
            style={height ? { height } : undefined}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={cn('skeleton rounded-lg', className)}
      style={height ? { height } : undefined}
      aria-hidden="true"
    />
  )
}

/** Full table skeleton — mirrors table row structure */
export function TableSkeleton({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full space-y-0">
      {/* Header */}
      <div className="flex gap-4 border-b border-border px-4 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="skeleton h-3.5 flex-1 rounded" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-border-light px-4 py-3.5">
          {Array.from({ length: cols }).map((_, j) => (
            <div
              key={j}
              className={cn(
                'skeleton h-4 rounded',
                j === 0 ? 'w-[40%]' : j === cols - 1 ? 'w-[60px]' : 'flex-1'
              )}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

/** Stat card skeleton */
export function StatCardSkeleton() {
  return (
    <div className="admin-surface p-5">
      <div className="skeleton mb-3 h-3.5 w-24 rounded" />
      <div className="skeleton mb-2 h-8 w-32 rounded" />
      <div className="skeleton h-3 w-20 rounded" />
    </div>
  )
}
