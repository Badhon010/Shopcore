import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leadingIcon?: ReactNode
  trailingIcon?: ReactNode
  error?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, leadingIcon, trailingIcon, error, type = 'text', ...props }, ref) => {
    if (leadingIcon || trailingIcon) {
      return (
        <div className="relative">
          {leadingIcon && (
            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-text-muted [&_svg]:h-4 [&_svg]:w-4">
              {leadingIcon}
            </div>
          )}
          <input
            ref={ref}
            type={type}
            className={cn(
              'h-9 w-full rounded-lg border bg-surface text-sm text-text-primary placeholder:text-text-muted',
              'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary',
              error ? 'border-danger' : 'border-border hover:border-border-strong',
              leadingIcon  ? 'pl-9'  : 'pl-3',
              trailingIcon ? 'pr-9' : 'pr-3',
              'disabled:cursor-not-allowed disabled:opacity-50',
              className
            )}
            {...props}
          />
          {trailingIcon && (
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-text-muted [&_svg]:h-4 [&_svg]:w-4">
              {trailingIcon}
            </div>
          )}
        </div>
      )
    }

    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          'h-9 w-full rounded-lg border bg-surface px-3 text-sm text-text-primary placeholder:text-text-muted',
          'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary',
          error ? 'border-danger' : 'border-border hover:border-border-strong',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'
