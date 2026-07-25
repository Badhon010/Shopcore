import { cn } from '@/utils/cn'

interface AvatarProps {
  name?: string
  src?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-caption',
  md: 'h-10 w-10 text-body-sm',
  lg: 'h-12 w-12 text-body-md',
}

function getInitials(name?: string): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

function getColor(name?: string): string {
  if (!name) return 'hsl(var(--text-muted))'
  const colors = [
    'bg-primary-light text-primary',
    'bg-success-subtle text-success',
    'bg-warning-subtle text-warning',
    'bg-info-subtle text-info',
    'bg-accent-subtle text-accent',
  ]
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[hash % colors.length]
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const initials = getInitials(name)
  const colorClass = getColor(name)

  return (
    <div
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold',
        sizeMap[size],
        !src && colorClass,
        className
      )}
      aria-label={name}
    >
      {src ? (
        <img src={src} alt={name} className="h-full w-full rounded-full object-cover" />
      ) : (
        <span aria-hidden>{initials}</span>
      )}
    </div>
  )
}
