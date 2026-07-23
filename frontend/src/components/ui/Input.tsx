import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
  errorId?: string
  /** Controls input height. Defaults to 'md' (52px, matches lg Button). Use 'sm' beside small buttons. */
  inputSize?: 'sm' | 'md'
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, errorId, inputSize = 'md', ...props }, ref) => {
    return (
      <input
        ref={ref}
        aria-invalid={error ?? undefined}
        aria-describedby={errorId}
        className={cn(
          'flex w-full rounded-md border bg-bg px-4 py-2 text-text-primary',
          'placeholder:text-text-tertiary',
          'transition-colors',
          'focus-visible:outline-none focus-visible:shadow-focus-ring focus-visible:border-accent',
          'disabled:cursor-not-allowed disabled:opacity-50',
          inputSize === 'sm'
            ? 'h-10 text-body-sm'
            : 'h-[52px] text-body-md',
          error
            ? 'border-danger focus-visible:border-danger focus-visible:shadow-[0_0_0_3px_hsl(var(--danger)/0.25)]'
            : 'border-border',
          className
        )}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'
