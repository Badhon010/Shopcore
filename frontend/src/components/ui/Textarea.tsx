import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
  errorId?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, errorId, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        aria-invalid={error ?? undefined}
        aria-describedby={errorId}
        className={cn(
          'flex min-h-[80px] w-full rounded-md border bg-bg px-4 py-2.5 text-body-md text-text-primary',
          'placeholder:text-text-tertiary',
          'resize-y transition-colors',
          'focus-visible:outline-none focus-visible:shadow-focus-ring focus-visible:border-accent',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error
            ? 'border-danger focus-visible:border-danger focus-visible:shadow-[0_0_0_3px_hsl(var(--color-danger)/0.25)]'
            : 'border-border',
          className
        )}
        {...props}
      />
    )
  }
)

Textarea.displayName = 'Textarea'
