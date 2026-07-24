import { cn } from '@/utils/cn'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'avatar' | 'card' | 'image' | 'rect'
  lines?: number
}

export function Skeleton({ className, variant = 'rect', lines = 1 }: SkeletonProps) {
  if (variant === 'text' && lines > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }, (_, i) => (
          <div
            key={i}
            className={cn(
              'skeleton-shimmer rounded',
              i === lines - 1 ? 'h-3 w-3/4' : 'h-3 w-full',
              className
            )}
            aria-hidden
          />
        ))}
      </div>
    )
  }

  const variantClasses = {
    text: 'h-3 w-full rounded',
    avatar: 'rounded-full',
    card: 'rounded-lg',
    image: 'rounded-lg aspect-square',
    rect: 'rounded',
  }

  return (
    <div
      className={cn('skeleton-shimmer', variantClasses[variant], className)}
      aria-hidden
    />
  )
}

export function ProductCardSkeleton({ viewMode = 'grid' }: { viewMode?: 'grid' | 'list' }) {
  if (viewMode === 'list') {
    return (
      <div className="flex gap-4 rounded-xl border border-border p-0 overflow-hidden">
        <div className="skeleton-shimmer h-40 w-52 shrink-0" aria-hidden />
        <div className="flex flex-1 flex-col justify-between py-4 pr-4 gap-3">
          <div className="space-y-2">
            <Skeleton variant="text" className="h-3 w-1/4" />
            <Skeleton variant="text" className="h-4 w-3/4" />
            <Skeleton variant="text" className="h-3 w-full" />
            <Skeleton variant="text" className="h-3 w-2/3" />
          </div>
          <div className="flex items-center justify-between">
            <Skeleton variant="text" className="h-5 w-1/4" />
            <Skeleton className="h-9 w-32 rounded-lg" />
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="space-y-3">
      <Skeleton variant="image" className="aspect-[4/3] w-full" />
      <div className="space-y-2 px-0.5">
        <Skeleton variant="text" className="h-3 w-2/3" />
        <Skeleton variant="text" className="h-3 w-full" />
        <Skeleton variant="text" className="h-4 w-1/3" />
      </div>
    </div>
  )
}

export function ProductDetailSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <Skeleton className="aspect-square w-full rounded-xl" />
      <div className="space-y-4">
        <Skeleton variant="text" className="h-6 w-3/4" />
        <Skeleton variant="text" className="h-4 w-1/2" />
        <Skeleton variant="text" className="h-8 w-1/3" />
        <div className="space-y-2">
          <Skeleton variant="text" className="h-3 w-full" lines={3} />
        </div>
        <Skeleton className="h-12 w-full rounded-md" />
      </div>
    </div>
  )
}
