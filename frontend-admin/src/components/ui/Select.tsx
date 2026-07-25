import { forwardRef, type SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean
  errorId?: string
  containerClassName?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, containerClassName, error, errorId, children, ...props }, ref) => (
    <div className={cn('relative w-full', containerClassName)}>
      <select
        ref={ref}
        aria-invalid={error || undefined}
        aria-describedby={errorId}
        className={cn(
          'flex h-[52px] w-full appearance-none rounded-md border bg-background px-4 py-2 pr-10',
          'text-body-md text-text-primary transition-colors',
          'focus-visible:border-primary focus-visible:outline-none focus-visible:shadow-focus-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error ? 'border-danger' : 'border-border',
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
        aria-hidden
      />
    </div>
  )
)
Select.displayName = 'Select'
