import { cn } from '@/utils/cn'
import { Spinner } from '@/components/feedback/Spinner'

interface LoadingScreenProps {
  label?: string
  className?: string
}

/**
 * Full-surface loading state used for route-level suspense and auth guards.
 * Branded with the ShopCore mark so it reads as part of the product.
 */
export function LoadingScreen({ label = 'Loading…', className }: LoadingScreenProps) {
  return (
    <div
      className={cn('flex min-h-[50vh] flex-col items-center justify-center gap-4', className)}
      role="status"
      aria-live="polite"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-md">
        <span className="text-sm font-bold text-primary-foreground">S</span>
      </div>
      <div className="flex items-center gap-2">
        <Spinner size="sm" className="text-primary" />
        <span className="text-sm text-text-muted">{label}</span>
      </div>
    </div>
  )
}
