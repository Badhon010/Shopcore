import { type LucideIcon, TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/utils/cn'

interface StatCardProps {
  title: string
  value: string | number
  icon?: LucideIcon
  trend?: { value: number; label?: string }
  description?: string
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger'
  className?: string
  isLoading?: boolean
}

const variantMap = {
  default: 'bg-bg-subtle text-text-secondary',
  primary: 'bg-primary-light text-primary',
  success: 'bg-success-subtle text-success',
  warning: 'bg-warning-subtle text-warning',
  danger: 'bg-danger-subtle text-danger',
}

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  description,
  variant = 'default',
  className,
  isLoading,
}: StatCardProps) {
  if (isLoading) {
    return (
      <div className={cn('rounded-xl border border-border bg-surface p-6 shadow-xs', className)}>
        <div className="flex items-center justify-between">
          <div className="h-4 w-28 animate-pulse rounded bg-skeleton" />
          <div className="h-10 w-10 animate-pulse rounded-lg bg-skeleton" />
        </div>
        <div className="mt-4 h-8 w-20 animate-pulse rounded bg-skeleton" />
        <div className="mt-2 h-3 w-32 animate-pulse rounded bg-skeleton" />
      </div>
    )
  }

  const isPositive = (trend?.value ?? 0) >= 0

  return (
    <div className={cn('rounded-xl border border-border bg-surface p-6 shadow-xs', className)}>
      <div className="flex items-center justify-between">
        <p className="text-body-sm font-medium text-text-secondary">{title}</p>
        {Icon && (
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', variantMap[variant])}>
            <Icon className="h-5 w-5" aria-hidden />
          </div>
        )}
      </div>
      <p className="mt-3 text-heading-lg font-bold text-text-primary">{value}</p>
      {(trend || description) && (
        <div className="mt-2 flex items-center gap-1.5">
          {trend && (
            <>
              {isPositive ? (
                <TrendingUp className="h-3.5 w-3.5 text-success" aria-hidden />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-danger" aria-hidden />
              )}
              <span
                className={cn(
                  'text-body-sm font-medium',
                  isPositive ? 'text-success' : 'text-danger'
                )}
              >
                {isPositive ? '+' : ''}{trend.value}%
              </span>
            </>
          )}
          {description && (
            <span className="text-body-sm text-text-muted">{description}</span>
          )}
        </div>
      )}
    </div>
  )
}
