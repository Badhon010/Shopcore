import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
  errorId?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, errorId, ...props }, ref) => (
    <input
      ref={ref}
      aria-invalid={error || undefined}
      aria-describedby={errorId}
      className={cn(
        'flex h-[52px] w-full rounded-md border bg-bg px-4 py-2 text-body-md text-text-primary',
        'placeholder:text-text-tertiary transition-colors',
        'focus-visible:border-accent focus-visible:outline-none focus-visible:shadow-focus-ring',
        'disabled:cursor-not-allowed disabled:opacity-50',
        error ? 'border-danger' : 'border-border',
        className
      )}
      {...props}
    />
  )
)
Input.displayName = 'Input'