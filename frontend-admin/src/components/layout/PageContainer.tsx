import { type ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface PageContainerProps {
  children: ReactNode
  className?: string
}

/**
 * Consistent page content wrapper. Applies the shared container width and
 * vertical rhythm so every page has identical spacing.
 */
export function PageContainer({ children, className }: PageContainerProps) {
  return <div className={cn('container-page py-6 sm:py-8', className)}>{children}</div>
}
