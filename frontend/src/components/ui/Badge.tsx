import { type HTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/utils/cn'

const badgeVariants = cva(
  'inline-flex items-center rounded-sm px-2 py-0.5 text-caption font-medium transition-colors',
  {
    variants: {
      variant: {
        neutral: 'bg-bg-subtle text-text-secondary border border-border',
        success: 'bg-success/10 text-success border border-success/20',
        warning: 'bg-warning/10 text-warning border border-warning/20',
        danger: 'bg-danger-subtle text-danger border border-danger/20',
        accent: 'bg-accent-subtle text-accent border border-accent/20',
      },
    },
    defaultVariants: { variant: 'neutral' },
  }
)

interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />
}

export { badgeVariants }
