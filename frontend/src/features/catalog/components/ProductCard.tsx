import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Heart, ShoppingCart, Check, Star } from 'lucide-react'
import { cn } from '@/utils/cn'
import { formatPrice } from '@/utils/formatCurrency'
import { buildRoute, ROUTES } from '@/constants/routes'
import { useToggleWishlist, useWishlist } from '@/features/wishlist/hooks/useWishlist'
import { useAddToCart } from '@/features/cart/hooks/useCart'
import { useCartUI } from '@/contexts/CartUIContext'
import { useAuth } from '@/contexts/AuthContext'
import { env } from '@/config/env'
import { queryKeys } from '@/services/queryKeys'
import { useQueryClient } from '@tanstack/react-query'
import type { Product } from '@/types/models'

interface ProductCardProps {
  product: Product
  priority?: boolean
  viewMode?: 'grid' | 'list'
}

export function ProductCard({ product, priority = false, viewMode = 'grid' }: ProductCardProps) {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const toggleWishlist = useToggleWishlist()
  const { data: wishlist } = useWishlist()
  const addToCart = useAddToCart()
  const { openCart } = useCartUI()
  const queryClient = useQueryClient()
  const [addedToCart, setAddedToCart] = useState(false)

  const isWishlisted = wishlist?.some((w) => w.product.id === product.id) ?? false
  const { formatted, formattedOriginal, isDiscounted, discountPercent } = formatPrice(
    product.price,
    product.original_price
  )

  const primaryImage = product.images.find((i) => i.is_primary) ?? product.images[0]
  const isOutOfStock = !product.in_stock
  const isNew = product.created_at
    ? Date.now() - new Date(product.created_at).getTime() < 1000 * 60 * 60 * 24 * 30
    : false
  const defaultVariant = product.default_variant ?? product.variants[0]
  const canAddToCart = !isOutOfStock && (product.variants.length === 0 || Boolean(defaultVariant))

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isAuthenticated) {
      navigate(ROUTES.LOGIN, { state: { wishlistIntent: product.id } })
      return
    }
    toggleWishlist.mutate({ productId: product.id, isCurrentlyWishlisted: isWishlisted })
  }

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!canAddToCart) return
    addToCart.mutate(
      { product_id: product.id, variant_id: defaultVariant?.id, quantity: 1 },
      {
        onSuccess: () => {
          setAddedToCart(true)
          setTimeout(() => { setAddedToCart(false); openCart() }, 1200)
        },
      }
    )
  }

  const handleMouseEnter = () => {
    void queryClient.prefetchQuery({
      queryKey: queryKeys.catalog.product(product.slug),
      queryFn: () =>
        import('@/services/api/catalog.service').then((m) =>
          m.catalogService.getProduct(product.slug)
        ),
    })
  }

  const AddToCartBtn = (
    <button
      type="button"
      onClick={handleAddToCart}
      disabled={!canAddToCart || addToCart.isPending}
      className={cn(
        'flex items-center justify-center gap-2 rounded-lg text-[13px] font-semibold',
        'transition-all duration-150 active:scale-[0.98]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
        viewMode === 'list'
          ? 'shrink-0 px-5 py-2.5'
          : 'w-full py-2.5',
        addedToCart
          ? 'bg-success text-white'
          : canAddToCart
          ? 'bg-text-primary text-white hover:bg-text-primary/85'
          : 'cursor-not-allowed bg-bg-subtle text-text-tertiary',
        addToCart.isPending && 'opacity-70 pointer-events-none',
      )}
    >
      {addedToCart ? (
        <><Check className="h-3.5 w-3.5 stroke-[2.5]" />{viewMode === 'grid' ? 'Added' : 'Added to cart'}</>
      ) : canAddToCart ? (
        <><ShoppingCart className="h-3.5 w-3.5" />{viewMode === 'grid' ? 'Add to Cart' : 'Add to Cart'}</>
      ) : (
        'Out of Stock'
      )}
    </button>
  )

  const WishlistBtn = env.VITE_ENABLE_WISHLIST ? (
    <button
      type="button"
      aria-label={isWishlisted ? `Remove from wishlist` : `Add to wishlist`}
      onClick={handleWishlistToggle}
      disabled={toggleWishlist.isPending}
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
        'bg-white shadow-sm border border-border/60',
        'transition-all duration-150 hover:scale-110 hover:shadow-md',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        toggleWishlist.isPending && 'pointer-events-none opacity-50'
      )}
    >
      <Heart
        className={cn(
          'h-4 w-4 transition-colors',
          isWishlisted ? 'fill-danger stroke-danger' : 'stroke-text-secondary'
        )}
      />
    </button>
  ) : null

  /* ─── LIST VIEW ─────────────────────────────────────────────── */
  if (viewMode === 'list') {
    return (
      <article
        className="group flex gap-4 overflow-hidden rounded-xl border border-border bg-surface transition-shadow duration-200 hover:shadow-[0_4px_20px_rgba(0,0,0,0.07)]"
        onMouseEnter={handleMouseEnter}
      >
        {/* Image */}
        <Link
          to={buildRoute.product(product.slug)}
          className="relative shrink-0 overflow-hidden bg-bg-subtle"
          aria-label={`View ${product.name}`}
          tabIndex={0}
        >
          <div className="relative h-full w-40 sm:w-52">
            <img
              src={primaryImage?.url ?? '/placeholder-product.svg'}
              alt={primaryImage?.alt ?? product.name}
              loading={priority ? 'eager' : 'lazy'}
              fetchPriority={priority ? 'high' : 'auto'}
              width={208}
              height={208}
              onError={(e) => {
                e.currentTarget.onerror = null
                e.currentTarget.src = '/placeholder-product.svg'
              }}
              className={cn(
                'h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]',
                isOutOfStock && 'opacity-50 grayscale-[0.3]'
              )}
            />
            {/* Badges */}
            <div className="absolute left-2 top-2 flex flex-col gap-1">
              {isDiscounted && discountPercent && (
                <span className="rounded-md bg-danger px-2 py-0.5 text-[11px] font-bold text-white leading-tight">
                  -{discountPercent}%
                </span>
              )}
              {isNew && !isDiscounted && (
                <span className="rounded-md bg-emerald-500 px-2 py-0.5 text-[11px] font-bold text-white leading-tight">
                  New
                </span>
              )}
              {isOutOfStock && (
                <span className="rounded-md bg-black/60 px-2 py-0.5 text-[11px] text-white/90 leading-tight">
                  Sold out
                </span>
              )}
            </div>
          </div>
        </Link>

        {/* Content */}
        <div className="flex flex-1 min-w-0 flex-col justify-between gap-3 py-4 pr-4">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-text-tertiary">
              {product.category.name}
            </p>
            <Link to={buildRoute.product(product.slug)} tabIndex={-1}>
              <h3 className="mt-0.5 text-[15px] font-semibold leading-snug text-text-primary group-hover:text-accent transition-colors duration-150">
                {product.name}
              </h3>
            </Link>

            {product.short_description && (
              <p className="mt-1.5 line-clamp-2 text-[13px] text-text-secondary leading-relaxed">
                {product.short_description}
              </p>
            )}

            {product.rating_count > 0 && (
              <div className="mt-2 flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      'h-3 w-3',
                      i < Math.round(product.rating_average)
                        ? 'fill-amber-400 stroke-amber-400'
                        : 'fill-transparent stroke-border-strong'
                    )}
                  />
                ))}
                <span className="ml-1 text-[12px] text-text-tertiary">({product.rating_count})</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-baseline gap-2">
              <span className={cn('text-[17px] font-bold', isDiscounted ? 'text-danger' : 'text-text-primary')}>
                {formatted}
              </span>
              {isDiscounted && formattedOriginal && (
                <span className="text-[13px] text-text-tertiary line-through">{formattedOriginal}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {WishlistBtn}
              {AddToCartBtn}
            </div>
          </div>
        </div>
      </article>
    )
  }

  /* ─── GRID VIEW (default) ───────────────────────────────────── */
  return (
    <article
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition-shadow duration-200 hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)]"
      onMouseEnter={handleMouseEnter}
    >
      {/* Image */}
      <Link
        to={buildRoute.product(product.slug)}
        className="relative block overflow-hidden bg-bg-subtle"
        aria-label={`View ${product.name}`}
        tabIndex={0}
      >
        <div className="aspect-[4/3] overflow-hidden">
          <img
            src={primaryImage?.url ?? '/placeholder-product.svg'}
            alt={primaryImage?.alt ?? product.name}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            width={600}
            height={450}
            onError={(e) => {
              e.currentTarget.onerror = null
              e.currentTarget.src = '/placeholder-product.svg'
            }}
            className={cn(
              'h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]',
              isOutOfStock && 'opacity-50 grayscale-[0.3]'
            )}
          />
        </div>

        {/* Badges */}
        <div className="absolute left-2.5 top-2.5 flex flex-col gap-1">
          {isDiscounted && discountPercent && (
            <span className="rounded-md bg-danger px-2 py-0.5 text-[11px] font-bold text-white leading-tight">
              -{discountPercent}%
            </span>
          )}
          {isNew && !isDiscounted && (
            <span className="rounded-md bg-emerald-500 px-2 py-0.5 text-[11px] font-bold text-white leading-tight">
              New
            </span>
          )}
          {isOutOfStock && (
            <span className="rounded-md bg-black/60 px-2 py-0.5 text-[11px] text-white/90 leading-tight">
              Sold out
            </span>
          )}
        </div>

        {/* Heart — top-right */}
        {env.VITE_ENABLE_WISHLIST && (
          <button
            type="button"
            aria-label={isWishlisted ? `Remove from wishlist` : `Add to wishlist`}
            onClick={handleWishlistToggle}
            disabled={toggleWishlist.isPending}
            className={cn(
              'absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full',
              'bg-white shadow-sm border border-border/60',
              'transition-all duration-150 hover:scale-110 hover:shadow-md',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              toggleWishlist.isPending && 'pointer-events-none opacity-50'
            )}
          >
            <Heart
              className={cn(
                'h-4 w-4 transition-colors',
                isWishlisted ? 'fill-danger stroke-danger' : 'stroke-text-secondary'
              )}
            />
          </button>
        )}
      </Link>

      {/* Info */}
      <Link
        to={buildRoute.product(product.slug)}
        className="flex flex-col flex-1 px-3.5 pt-3 pb-2 focus-visible:outline-none"
        tabIndex={-1}
      >
        <p className="truncate text-[11px] font-medium uppercase tracking-wide text-text-tertiary">
          {product.category.name}
        </p>
        <h3 className="mt-1 line-clamp-2 text-[14px] font-semibold leading-snug text-text-primary group-hover:text-accent transition-colors duration-150">
          {product.name}
        </h3>

        {product.rating_count > 0 && (
          <div className="mt-1.5 flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={cn(
                  'h-3 w-3',
                  i < Math.round(product.rating_average)
                    ? 'fill-amber-400 stroke-amber-400'
                    : 'fill-transparent stroke-border-strong'
                )}
              />
            ))}
            <span className="text-[12px] text-text-tertiary">({product.rating_count})</span>
          </div>
        )}

        <div className="mt-2 flex items-baseline gap-2">
          <span className={cn('text-[15px] font-bold', isDiscounted ? 'text-danger' : 'text-text-primary')}>
            {formatted}
          </span>
          {isDiscounted && formattedOriginal && (
            <span className="text-[12px] text-text-tertiary line-through">{formattedOriginal}</span>
          )}
        </div>
      </Link>

      {/* Add to Cart */}
      <div className="px-3.5 pb-3.5 pt-1.5">
        {AddToCartBtn}
      </div>
    </article>
  )
}
