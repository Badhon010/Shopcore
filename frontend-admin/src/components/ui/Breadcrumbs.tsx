import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/utils/cn'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center gap-1', className)}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1
        return (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-text-muted" />}
            {isLast || !item.href ? (
              <span
                aria-current={isLast ? 'page' : undefined}
                className={cn(
                  'text-sm',
                  isLast ? 'font-medium text-text-primary' : 'text-text-muted'
                )}
              >
                {item.label}
              </span>
            ) : (
              <Link
                to={item.href}
                className="text-sm text-text-muted transition-colors hover:text-text-primary"
              >
                {item.label}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
