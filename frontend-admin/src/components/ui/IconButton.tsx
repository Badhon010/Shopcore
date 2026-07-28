import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode
  label: string // accessible label (aria-label)
  size?: 'sm' | 'md' | 'lg'
  variant?: 'ghost' | 'surface'
}

const SIZE = {
  sm: 'h-7 w-7 [&_svg]:h-3.5 [&_svg]:w-3.5',
  md: 'h-8 w-8 [&_svg]:h-4 [&_svg]:w-4',
  lg: 'h-9 w-9 [&_svg]:h-4.5 [&_svg]:w-4.5',
}

const VARIANT = {
  ghost:   'text-text-secondary hover:bg-bg-subtle hover:text-text-primary',
  surface: 'border border-border bg-surface text-text-secondary hover:bg-bg-subtle hover:text-text-primary',
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, label, size = 'md', variant = 'ghost', className, ...props }, ref) => (
    <button
      ref={ref}
      aria-label={label}
      className={cn(
        'inline-flex items-center justify-center rounded-lg transition-colors',
        'focus-visible:outline-none focus-visible:shadow-focus-ring',
        'disabled:pointer-events-none disabled:opacity-50',
        SIZE[size],
        VARIANT[variant],
        className
      )}
      {...props}
    >
      {icon}
    </button>
  )
)
IconButton.displayName = 'IconButton'
