import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface BreadcrumbItem {
  label: string
  to?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center gap-1', className)}>
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1
          return (
            <li key={idx} className="flex items-center gap-1">
              {idx > 0 && (
                <ChevronRight className="h-3.5 w-3.5 text-text-muted" aria-hidden />
              )}
              {isLast || !item.to ? (
                <span
                  className={cn(
                    'text-body-sm',
                    isLast ? 'font-medium text-text-primary' : 'text-text-secondary'
                  )}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.to}
                  className="text-body-sm text-text-secondary transition-colors hover:text-text-primary"
                >
                  {item.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
