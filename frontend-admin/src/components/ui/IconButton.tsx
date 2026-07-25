import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  size?: 'sm' | 'md'
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, size = 'md', className, children, ...props }, ref) => (
    <button
      ref={ref}
      aria-label={label}
      className={cn(
        'inline-flex items-center justify-center rounded-md text-text-secondary transition-colors',
        'hover:bg-bg-subtle hover:text-text-primary focus-visible:outline-none focus-visible:shadow-focus-ring',
        'disabled:pointer-events-none disabled:opacity-50',
        size === 'sm' ? 'h-9 w-9' : 'h-11 w-11',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
)
IconButton.displayName = 'IconButton'