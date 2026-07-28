import { type ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/utils/cn'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        default:   'bg-secondary text-secondary-foreground',
        success:   'bg-success-subtle text-success',
        warning:   'bg-warning-subtle text-warning',
        danger:    'bg-danger-subtle text-danger',
        info:      'bg-info-subtle text-info',
        secondary: 'bg-secondary text-secondary-foreground',
        outline:   'border border-border bg-transparent text-text-secondary',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps extends VariantProps<typeof badgeVariants> {
  children: ReactNode
  className?: string
  icon?: ReactNode
}

export function Badge({ children, variant, className, icon }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)}>
      {icon && <span className="[&_svg]:h-3 [&_svg]:w-3">{icon}</span>}
      {children}
    </span>
  )
}
