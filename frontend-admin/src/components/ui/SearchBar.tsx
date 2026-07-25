import { Search, X } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { InputHTMLAttributes } from 'react'

interface SearchBarProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  value: string
  onClear?: () => void
  className?: string
  containerClassName?: string
}

export function SearchBar({ value, onClear, className, containerClassName, ...props }: SearchBarProps) {
  return (
    <div className={cn('relative', containerClassName)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
        aria-hidden
      />
      <input
        type="search"
        value={value}
        className={cn(
          'h-10 w-full rounded-md border border-border bg-surface pl-9 pr-9 text-body-sm text-text-primary',
          'placeholder:text-text-muted transition-colors',
          'focus-visible:border-primary focus-visible:outline-none focus-visible:shadow-focus-ring',
          className
        )}
        {...props}
      />
      {value && onClear && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-text-muted transition-colors hover:text-text-primary"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
