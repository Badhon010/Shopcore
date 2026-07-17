import { cn } from '@/utils/cn'

interface ResponsiveImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
  objectFit?: 'cover' | 'contain' | 'fill'
  aspectRatio?: string
}

export function ResponsiveImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  objectFit = 'cover',
  aspectRatio,
}: ResponsiveImageProps) {
  const isDecorative = alt === ''

  return (
    <div
      className={cn('overflow-hidden', aspectRatio && `aspect-[${aspectRatio}]`, className)}
      style={aspectRatio ? undefined : undefined}
    >
      <img
        src={src}
        alt={isDecorative ? '' : alt}
        aria-hidden={isDecorative ? true : undefined}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        className={cn(
          'h-full w-full transition-opacity duration-300',
          objectFit === 'cover' && 'object-cover',
          objectFit === 'contain' && 'object-contain',
          objectFit === 'fill' && 'object-fill'
        )}
        onError={(e) => {
          const img = e.currentTarget
          img.src = '/placeholder-product.svg'
        }}
      />
    </div>
  )
}
