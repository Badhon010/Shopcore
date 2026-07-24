import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { cn } from '@/utils/cn'

export interface Crumb {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  items: Crumb[]
  className?: string
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  const siteUrl = (import.meta.env.VITE_APP_URL as string | undefined) ?? 'https://shopcore.com'

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      ...(item.href ? { item: `${siteUrl}${item.href}` } : {}),
    })),
  }

  return (
    <>
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
      <nav aria-label="Breadcrumb" className={cn('min-w-0', className)}>
        <ol className="flex min-w-0 flex-wrap items-center gap-1 text-body-sm text-text-secondary">
          {items.map((item, index) => {
            const isLast = index === items.length - 1
            return (
              <li key={index} className="flex min-w-0 items-center gap-1">
                {index > 0 && (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-text-tertiary" aria-hidden />
                )}
                {isLast || !item.href ? (
                  <span
                    aria-current={isLast ? 'page' : undefined}
                    title={item.label}
                    className={cn(
                      'block max-w-[160px] truncate sm:max-w-[220px]',
                      isLast ? 'text-text-primary font-medium' : ''
                    )}
                  >
                    {item.label}
                  </span>
                ) : (
                  <Link
                    to={item.href}
                    title={item.label}
                    className="block max-w-[160px] truncate transition-colors hover:text-accent hover:underline underline-offset-4 sm:max-w-[220px]"
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            )
          })}
        </ol>
      </nav>
    </>
  )
}
