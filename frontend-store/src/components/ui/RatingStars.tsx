import { Star } from 'lucide-react'
import { cn } from '@/utils/cn'

interface RatingStarsProps {
  rating: number
  maxRating?: number
  size?: 'sm' | 'md' | 'lg'
  interactive?: boolean
  onRate?: (rating: number) => void
  className?: string
}

const sizeClasses = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
}

export function RatingStars({
  rating,
  maxRating = 5,
  size = 'md',
  interactive = false,
  onRate,
  className,
}: RatingStarsProps) {
  return (
    <div
      role={interactive ? 'radiogroup' : undefined}
      aria-label={interactive ? 'Rating' : `Rating: ${rating} out of ${maxRating}`}
      className={cn('flex items-center gap-0.5', className)}
    >
      {Array.from({ length: maxRating }, (_, i) => {
        const filled = i < Math.floor(rating)
        const partial = !filled && i < rating

        return interactive ? (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={i + 1 === Math.round(rating)}
            aria-label={`${i + 1} star${i + 1 !== 1 ? 's' : ''}`}
            onClick={() => onRate?.(i + 1)}
            className={cn(
              'focus-visible:outline-none focus-visible:shadow-focus-ring rounded',
              'transition-colors hover:scale-110'
            )}
          >
            <Star
              className={cn(
                sizeClasses[size],
                'transition-colors',
                filled || partial ? 'fill-warning text-warning' : 'fill-transparent text-text-tertiary'
              )}
            />
          </button>
        ) : (
          <span key={i} aria-hidden>
            <Star
              className={cn(
                sizeClasses[size],
                filled
                  ? 'fill-warning text-warning'
                  : partial
                    ? 'fill-warning/50 text-warning'
                    : 'fill-transparent text-text-tertiary'
              )}
            />
          </span>
        )
      })}
    </div>
  )
}
