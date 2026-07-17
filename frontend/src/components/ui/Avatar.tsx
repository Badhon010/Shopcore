import * as RadixAvatar from '@radix-ui/react-avatar'
import { cn } from '@/utils/cn'

interface AvatarProps {
  src?: string
  alt?: string
  fallback: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeClasses = {
  sm: 'h-8 w-8 text-caption',
  md: 'h-10 w-10 text-body-sm',
  lg: 'h-12 w-12 text-body-md',
  xl: 'h-16 w-16 text-heading-sm',
}

export function Avatar({ src, alt, fallback, size = 'md', className }: AvatarProps) {
  return (
    <RadixAvatar.Root
      className={cn(
        'relative flex shrink-0 overflow-hidden rounded-full',
        sizeClasses[size],
        className
      )}
    >
      <RadixAvatar.Image src={src} alt={alt ?? fallback} className="h-full w-full object-cover" />
      <RadixAvatar.Fallback
        delayMs={src ? 600 : 0}
        className="flex h-full w-full items-center justify-center bg-accent-subtle text-accent font-semibold uppercase"
      >
        {fallback.slice(0, 2)}
      </RadixAvatar.Fallback>
    </RadixAvatar.Root>
  )
}
