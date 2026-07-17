import { cn } from '@/utils/cn'
import type { ReactNode } from 'react'

interface PageContainerProps {
  children: ReactNode
  className?: string
  as?: 'div' | 'main' | 'section'
}

export function PageContainer({ children, className, as: Tag = 'div' }: PageContainerProps) {
  return (
    <Tag className={cn('container-page', className)}>
      {children}
    </Tag>
  )
}
