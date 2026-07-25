import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
  errorId?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, errorId, ...props }, ref) => (
    <textarea
      ref={ref}
      aria-invalid={error || undefined}
      aria-describedby={errorId}
      className={cn(
        'flex min-h-[120px] w-full resize-y rounded-md border bg-background px-4 py-3',
        'text-body-md text-text-primary placeholder:text-text-muted transition-colors',
        'focus-visible:border-primary focus-visible:outline-none focus-visible:shadow-focus-ring',
        'disabled:cursor-not-allowed disabled:opacity-50',
        error ? 'border-danger' : 'border-border',
        className
      )}
      {...props}
    />
  )
)
Textarea.displayName = 'Textarea'
