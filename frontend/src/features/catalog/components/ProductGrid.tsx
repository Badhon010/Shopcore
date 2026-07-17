import { ProductCard } from './ProductCard'
import { ProductCardSkeleton } from '@/components/feedback/Skeleton'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ShoppingBag } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { Product } from '@/types/models'

interface ProductGridProps {
  products: Product[]
  isLoading?: boolean
  skeletonCount?: number
  onClearFilters?: () => void
  viewMode?: 'grid' | 'list'
}

export function ProductGrid({
  products,
  isLoading,
  skeletonCount = 12,
  onClearFilters,
  viewMode = 'grid',
}: ProductGridProps) {
  const gridClass =
    viewMode === 'list'
      ? 'flex flex-col gap-4'
      : 'grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4'

  if (isLoading) {
    return (
      <div role="status" aria-label="Loading products" className={viewMode === 'list' ? 'flex flex-col gap-4' : gridClass}>
        {Array.from({ length: skeletonCount }, (_, i) => (
          <ProductCardSkeleton key={i} viewMode={viewMode} />
        ))}
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingBag className="h-8 w-8" />}
        title="No products found"
        description="Try adjusting your filters or search to find what you're looking for."
        action={onClearFilters ? { label: 'Clear filters', onClick: onClearFilters } : undefined}
      />
    )
  }

  return (
    <div className={gridClass}>
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          priority={index < 8}
          viewMode={viewMode}
        />
      ))}
    </div>
  )
}
