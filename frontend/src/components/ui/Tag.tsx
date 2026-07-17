import { X } from 'lucide-react'
import { cn } from '@/utils/cn'

interface TagProps {
  label: string
  onRemove?: () => void
  className?: string
}

export function Tag({ label, onRemove, className }: TagProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-bg-subtle px-2.5 py-0.5 text-caption font-medium text-text-secondary border border-border',
        className
      )}
    >
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${label}`}
          className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-border hover:text-text-primary focus-visible:outline-none focus-visible:shadow-focus-ring"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </span>
  )
}
