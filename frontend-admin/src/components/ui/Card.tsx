import { cn } from '@/utils/cn'
import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  noPadding?: boolean
}

export function Card({ className, children, noPadding, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-surface shadow-xs',
        !noPadding && 'p-6',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center justify-between gap-4', className)} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={cn('text-heading-sm font-semibold text-text-primary', className)} {...props}>
      {children}
    </h2>
  )
}

export function CardDescription({ className, children, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-body-sm text-text-secondary', className)} {...props}>
      {children}
    </p>
  )
}
