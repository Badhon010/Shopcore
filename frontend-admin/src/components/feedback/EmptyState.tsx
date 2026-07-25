import { type LucideIcon, Inbox } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface px-6 py-16 text-center shadow-xs',
        className
      )}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-bg-subtle">
        <Icon className="h-7 w-7 text-text-muted" aria-hidden />
      </div>
      <h3 className="text-body-md font-semibold text-text-primary">{title}</h3>
      {description && (
        <p className="mt-1 max-w-xs text-body-sm text-text-secondary">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
