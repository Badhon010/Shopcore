import { useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useState } from 'react'
import { Minus, Plus, ShoppingBag } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Button } from '@/components/ui/Button'
import { Tabs } from '@/components/ui/Tabs'
import { RatingStars } from '@/components/ui/RatingStars'
import { IconButton } from '@/components/ui/IconButton'
import { ProductDetailSkeleton } from '@/components/feedback/Skeleton'
import { ErrorState } from '@/components/feedback/ErrorState'
import { StockBadge } from '@/features/catalog/components/StockBadge'
import { VariantSelector } from '@/features/catalog/components/VariantSelector'
import { ReviewList } from '@/features/catalog/components/ReviewList'
import { ReviewForm } from '@/features/catalog/components/ReviewForm'
import { WishlistButton } from '@/features/wishlist/components/WishlistButton'
import { useProduct } from '@/features/catalog/hooks/useProducts'
import { useAddToCart } from '@/features/cart/hooks/useCart'
import { useCartUI } from '@/contexts/CartUIContext'
import { useAuth } from '@/contexts/AuthContext'
import { formatPrice } from '@/utils/formatCurrency'
import { ROUTES, buildRoute } from '@/constants/routes'
import { env } from '@/config/env'
import { NotFoundPage } from './NotFoundPage'
import type { ProductVariant } from '@/types/models'

export function ProductDetailsPage() {
  const { productSlug = '' } = useParams()
  const { openCart } = useCartUI()
  const { isAuthenticated } = useAuth()

  const { data: product, isLoading, error, refetch } = useProduct(productSlug)

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [quantity, setQuantity] = useState(1)

  const addToCart = useAddToCart()

  if (isLoading) {
    return (
      <PageContainer className="py-8">
        <ProductDetailSkeleton />
      </PageContainer>
    )
  }

  if (error || !product) {
    const status = (error as { status?: number })?.status
    if (status === 404) return <NotFoundPage />
    return <ErrorState onRetry={refetch} />
  }

  const activeVariant = selectedVariant ?? product.default_variant ?? product.variants[0]
  const currentPrice = activeVariant?.price ?? product.price
  const currentOriginalPrice = activeVariant?.original_price ?? product.original_price
  const currentStock = activeVariant?.stock ?? product.stock
  const inStock = activeVariant ? activeVariant.is_available : product.in_stock

  const { formatted, formattedOriginal, isDiscounted } = formatPrice(currentPrice, currentOriginalPrice)

  const images = product.images
  const currentImage = images[selectedImageIndex]

  const handleAddToCart = () => {
    addToCart.mutate({
      product_id: product.id,
      variant_id: activeVariant?.id,
      quantity,
    })
    setTimeout(openCart, 300)
  }

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.short_description ?? product.description,
    image: images.map((i) => i.url),
    sku: activeVariant?.sku,
    aggregateRating: product.rating_count > 0 ? {
      '@type': 'AggregateRating',
      ratingValue: product.rating_average,
      reviewCount: product.rating_count,
    } : undefined,
    offers: {
      '@type': 'Offer',
      price: parseFloat(currentPrice),
      priceCurrency: env.VITE_DEFAULT_CURRENCY,
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  }

  const tabItems = [
    {
      value: 'description',
      label: 'Description',
      content: (
        <div className="prose prose-sm max-w-none text-text-secondary">
          <p>{product.description}</p>
        </div>
      ),
    },
    ...(product.specifications ? [{
      value: 'specs',
      label: 'Specifications',
      content: (
        <dl className="divide-y divide-border">
          {Object.entries(product.specifications).map(([k, v]) => (
            <div key={k} className="flex gap-4 py-2">
              <dt className="w-40 shrink-0 text-body-sm font-medium text-text-primary">{k}</dt>
              <dd className="text-body-sm text-text-secondary">{v}</dd>
            </div>
          ))}
        </dl>
      ),
    }] : []),
    ...(env.VITE_ENABLE_REVIEWS ? [{
      value: 'reviews',
      label: `Reviews (${product.rating_count})`,
      content: (
        <div className="space-y-8">
          <ReviewList productSlug={product.slug} />
          {isAuthenticated && (
            <div>
              <h3 className="mb-4 text-heading-sm font-semibold text-text-primary">Write a review</h3>
              <ReviewForm productSlug={product.slug} />
            </div>
          )}
        </div>
      ),
    }] : []),
    {
      value: 'shipping',
      label: 'Shipping & Returns',
      content: (
        <div className="space-y-3 text-body-sm text-text-secondary">
          <p><strong className="text-text-primary">Free standard shipping</strong> on all orders over $50.</p>
          <p><strong className="text-text-primary">Express delivery</strong> available at checkout (2–3 business days).</p>
          <p><strong className="text-text-primary">Returns:</strong> Free returns within 30 days of delivery. Items must be in original, unworn condition.</p>
        </div>
      ),
    },
  ]

  return (
    <>
      <Helmet>
        <title>{product.name} — ShopCore</title>
        <meta name="description" content={product.short_description ?? product.description.slice(0, 160)} />
        <meta property="og:title" content={product.name} />
        <meta property="og:description" content={product.short_description ?? product.description.slice(0, 160)} />
        {currentImage && <meta property="og:image" content={currentImage.url} />}
        <meta property="og:type" content="product" />
        <link rel="canonical" href={`${import.meta.env.VITE_APP_URL ?? ''}/products/${product.slug}`} />
        <script type="application/ld+json">{JSON.stringify(productJsonLd)}</script>
      </Helmet>

      <PageContainer className="py-8">
        <Breadcrumbs
          items={[
            { label: 'Home', href: ROUTES.HOME },
            { label: product.category.name, href: buildRoute.category(product.category.slug) },
            { label: product.name },
          ]}
          className="mb-6"
        />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Gallery */}
          <div className="space-y-3">
            <div className="aspect-square overflow-hidden rounded-xl bg-bg-subtle">
              {currentImage ? (
                <img
                  src={currentImage.url}
                  alt={currentImage.alt}
                  className="h-full w-full object-cover"
                  fetchPriority="high"
                  loading="eager"
                />
              ) : (
                <div className="h-full w-full bg-bg-subtle" />
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img, i) => (
                  <button
                    key={img.id}
                    onClick={() => setSelectedImageIndex(i)}
                    aria-label={img.alt || `Product image ${i + 1}`}
                    aria-pressed={i === selectedImageIndex}
                    className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors focus-visible:outline-none focus-visible:shadow-focus-ring ${
                      i === selectedImageIndex ? 'border-accent' : 'border-border hover:border-border-strong'
                    }`}
                  >
                    <img src={img.url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product info */}
          <div className="space-y-5">
            <div>
              <p className="text-caption uppercase tracking-widest text-text-tertiary">{product.category.name}</p>
              <h1 className="mt-1 text-heading-xl font-semibold text-text-primary">{product.name}</h1>

              {product.rating_count > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <RatingStars rating={product.rating_average} size="sm" />
                  <button
                    onClick={() => {
                      const el = document.querySelector('[data-radix-tabs-content][data-state="active"]') as HTMLElement
                      if (el) el.scrollIntoView({ behavior: 'smooth' })
                    }}
                    className="text-caption text-accent hover:underline focus-visible:outline-none"
                  >
                    {product.rating_count} {product.rating_count === 1 ? 'review' : 'reviews'}
                  </button>
                </div>
              )}
            </div>

            {/* Price */}
            <div className="flex items-center gap-3">
              <span className="text-heading-lg font-bold text-text-primary">{formatted}</span>
              {isDiscounted && formattedOriginal && (
                <span className="text-body-lg text-text-tertiary line-through">{formattedOriginal}</span>
              )}
            </div>

            <StockBadge inStock={inStock} stock={currentStock} />

            {product.variants.length > 0 && (
              <VariantSelector
                variants={product.variants}
                selectedVariant={activeVariant ?? null}
                onSelect={setSelectedVariant}
              />
            )}

            {product.short_description && (
              <p className="text-body-md text-text-secondary">{product.short_description}</p>
            )}

            {/* Quantity + Add to cart */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 rounded-lg border border-border">
                <IconButton
                  label="Decrease quantity"
                  size="md"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </IconButton>
                <span
                  className="min-w-[2rem] text-center text-body-md font-medium"
                  aria-label={`Quantity: ${quantity}`}
                  aria-live="polite"
                >
                  {quantity}
                </span>
                <IconButton
                  label="Increase quantity"
                  size="md"
                  onClick={() => setQuantity((q) => q + 1)}
                  disabled={currentStock !== undefined && quantity >= currentStock}
                >
                  <Plus className="h-4 w-4" />
                </IconButton>
              </div>

              <Button
                size="lg"
                className="flex-1"
                disabled={!inStock}
                isLoading={addToCart.isPending}
                onClick={handleAddToCart}
              >
                <ShoppingBag className="h-4 w-4" />
                {inStock ? 'Add to cart' : 'Out of stock'}
              </Button>

              {env.VITE_ENABLE_WISHLIST && (
                <WishlistButton productId={product.id} />
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-12">
          <Tabs items={tabItems} />
        </div>
      </PageContainer>
    </>
  )
}
