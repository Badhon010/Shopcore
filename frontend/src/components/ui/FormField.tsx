import { useId, type ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface FormFieldProps {
  label: string
  children: (id: string, errorId: string) => ReactNode
  error?: string
  helperText?: string
  required?: boolean
  className?: string
}

export function FormField({
  label,
  children,
  error,
  helperText,
  required,
  className,
}: FormFieldProps) {
  const id = useId()
  const errorId = `${id}-error`
  const helperId = `${id}-helper`

  return (
    <div className={cn('space-y-1.5', className)}>
      <label
        htmlFor={id}
        className="block text-body-sm font-medium text-text-primary"
      >
        {label}
        {required && (
          <span aria-hidden="true" className="ml-0.5 text-danger">
            *
          </span>
        )}
      </label>

      {children(id, errorId)}

      {error ? (
        <p id={errorId} role="alert" className="text-caption text-danger">
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-caption text-text-tertiary">
          {helperText}
        </p>
      ) : null}
    </div>
  )
}
