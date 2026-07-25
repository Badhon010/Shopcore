import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/utils/cn'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-overline font-semibold uppercase tracking-wide transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary-light text-primary',
        secondary: 'bg-bg-subtle text-text-secondary border border-border',
        success: 'bg-success-subtle text-success',
        warning: 'bg-warning-subtle text-warning',
        danger: 'bg-danger-subtle text-danger',
        info: 'bg-info-subtle text-info',
        accent: 'bg-accent-subtle text-accent',
        outline: 'border border-border text-text-secondary',
      },
      size: {
        sm: 'px-2 py-0.5 text-[10px]',
        md: 'px-2.5 py-0.5 text-overline',
        lg: 'px-3 py-1 text-caption',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean
}

import type React from 'react'

export function Badge({ className, variant, size, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size, className }))} {...props}>
      {dot && (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            variant === 'success' && 'bg-success',
            variant === 'warning' && 'bg-warning',
            variant === 'danger' && 'bg-danger',
            variant === 'info' && 'bg-info',
            (!variant || variant === 'default') && 'bg-primary',
            variant === 'secondary' && 'bg-text-muted',
            variant === 'accent' && 'bg-accent',
          )}
          aria-hidden
        />
      )}
      {children}
    </span>
  )
}
