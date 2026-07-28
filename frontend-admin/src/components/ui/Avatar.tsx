import { type ImgHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

interface AvatarProps extends ImgHTMLAttributes<HTMLImageElement> {
  name?: string
  size?: 'sm' | 'md' | 'lg'
}

const SIZE = {
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-8 w-8 text-xs',
  lg: 'h-10 w-10 text-sm',
}

function getInitials(name?: string): string {
  if (!name) return '?'
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('')
}

export function Avatar({ name, size = 'md', src, alt, className }: AvatarProps) {
  const initials = getInitials(name)

  if (src) {
    return (
      <img
        src={src}
        alt={alt ?? name ?? 'Avatar'}
        className={cn('rounded-full object-cover', SIZE[size], className)}
      />
    )
  }

  return (
    <div
      aria-label={name ?? 'User avatar'}
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-primary-light font-semibold text-primary',
        SIZE[size],
        className
      )}
    >
      {initials}
    </div>
  )
}
