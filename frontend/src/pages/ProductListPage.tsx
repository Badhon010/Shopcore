/**
 * ProductListPage — the single canonical product listing page.
 *
 * The URL is the ONLY source of filter state — no duplicate local state:
 *
 *   /products                               → all products, no filters
 *   /products?category=phones               → category filter
 *   /products?category=phones&brands=sony   → category + brand
 *   /products?price_min=10&price_max=200    → price range
 *   /products?in_stock=true&min_rating=4    → stock + rating
 *   /products?ordering=-average_rating      → sort
 *   /products?page=2                        → pagination
 *
 * All combinations compose freely. Browser Back/Forward restores exact state.
 * Legacy /products/category/:slug paths redirect here (see router.tsx).
 */
import { useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { SlidersHorizontal, LayoutGrid, LayoutList } from 'lucide-react'
import { useState } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { ProductGrid } from '@/features/catalog/components/ProductGrid'
import {
  ProductFilters,
  type FilterState,
} from '@/features/catalog/components/ProductFilters'
import { SortDropdown } from '@/features/catalog/components/SortDropdown'
import { Pagination } from '@/components/ui/Pagination'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { ErrorState } from '@/components/feedback/ErrorState'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Skeleton } from '@/components/feedback/Skeleton'
import { useProducts, useCategory } from '@/features/catalog/hooks/useProducts'
import { usePriceRange } from '@/features/catalog/hooks/usePriceRange'
import { APP_CONFIG } from '@/constants/config'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/utils/cn'
import { ROUTES, buildRoute } from '@/constants/routes'

export function ProductListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const isMobile = !useMediaQuery('(min-width: 1024px)')

  // ── All filter state derived from URL — single source of truth ────────────

  const category    = searchParams.get('category')    ?? undefined
  const page        = parseInt(searchParams.get('page') ?? '1', 10)
  const ordering    = searchParams.get('ordering')    ?? ''
  const inStockOnly = searchParams.get('in_stock')    === 'true'
  const minRating   = parseInt(searchParams.get('min_rating') ?? '0', 10)
  const brandsParam = searchParams.get('brands')      ?? undefined

  const priceMinParam = searchParams.get('price_min') !== null
    ? parseFloat(searchParams.get('price_min')!)
    : undefined
  const priceMaxParam = searchParams.get('price_max') !== null
    ? parseFloat(searchParams.get('price_max')!)
    : undefined

  // ── API data ──────────────────────────────────────────────────────────────

  // Price range bounds — used for slider UI only, not the filter itself.
  // Filter values come from the URL params above.
  const { minPrice, maxPrice, isLoading: priceLoading } = usePriceRange({ category })

  // Category metadata for heading / breadcrumbs (only when in category mode)
  const { data: categoryData, isLoading: catLoading } = useCategory(category ?? '')

  // Product list — query key contains every filter so any change fires exactly
  // one new request; placeholderData keeps the grid populated during transitions
  // instead of flashing an empty loading state.
  const { data, isLoading, isPlaceholderData, error, refetch } = useProducts({
    page,
    page_size: APP_CONFIG.pagination.defaultPageSize,
    ordering:  ordering   || undefined,
    in_stock:  inStockOnly || undefined,
    price_min: priceMinParam,
    price_max: priceMaxParam,
    category,
    brands:    brandsParam,
    min_rating: minRating > 0 ? minRating : undefined,
  })

  const totalCount = data?.count ?? 0
  const totalPages = Math.ceil(totalCount / APP_CONFIG.pagination.defaultPageSize)
  const pageSize   = APP_CONFIG.pagination.defaultPageSize
  const startItem  = totalCount > 0 ? (page - 1) * pageSize + 1 : 0
  const endItem    = Math.min(page * pageSize, totalCount)

  // ── FilterState object passed to ProductFilters (derived, never stored) ───

  const filters: FilterState = {
    priceRange:  [priceMinParam ?? minPrice, priceMaxParam ?? maxPrice],
    inStockOnly,
    minRating,
    ordering,
    brands: brandsParam ? brandsParam.split(',').filter(Boolean) : [],
  }

  // ── Event handlers ────────────────────────────────────────────────────────

  const handlePageChange = (p: number) => {
    setSearchParams((prev) => { prev.set('page', String(p)); return prev })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSortChange = (value: string) => {
    setSearchParams((prev) => {
      value ? prev.set('ordering', value) : prev.delete('ordering')
      prev.set('page', '1')
      return prev
    })
  }

  /**
   * Category selection — updates ?category= and resets price bounds params
   * because the price range is category-specific; keeping stale price params
   * from a different category's bounds would produce incorrect filtering.
   */
  const handleCategorySelect = (selectedSlug: string | undefined) => {
    setSearchParams((prev) => {
      if (selectedSlug) {
        prev.set('category', selectedSlug)
      } else {
        prev.delete('category')
      }
      prev.delete('price_min')
      prev.delete('price_max')
      prev.set('page', '1')
      return prev
    })
  }

  /**
   * Generic filter change — writes every filter field to the URL in one
   * atomic setSearchParams call. This is the canonical way to update filters;
   * it ensures the URL always reflects the complete filter state so that
   * browser Back/Forward and page refresh restore it exactly.
   */
  const handleFiltersChange = (f: FilterState) => {
    setSearchParams((prev) => {
      f.inStockOnly ? prev.set('in_stock', 'true') : prev.delete('in_stock')
      f.minRating > 0 ? prev.set('min_rating', String(f.minRating)) : prev.delete('min_rating')
      f.brands.length > 0 ? prev.set('brands', f.brands.join(',')) : prev.delete('brands')

      // Only write price params when they deviate from the full range.
      // This keeps URLs clean for unfiltered price ranges and avoids
      // unnecessarily locking in prices that match the default bounds.
      f.priceRange[0] > minPrice
        ? prev.set('price_min', String(f.priceRange[0]))
        : prev.delete('price_min')
      f.priceRange[1] < maxPrice
        ? prev.set('price_max', String(f.priceRange[1]))
        : prev.delete('price_max')

      prev.set('page', '1')
      return prev
    })
  }

  /** Reset all non-category filters — category is cleared via the category tree. */
  const handleClear = () => {
    setSearchParams((prev) => {
      prev.delete('in_stock')
      prev.delete('min_rating')
      prev.delete('brands')
      prev.delete('price_min')
      prev.delete('price_max')
      prev.set('page', '1')
      return prev
    })
  }

  // ── SEO ───────────────────────────────────────────────────────────────────

  const categoryName = categoryData?.name
  const pageTitle = category
    ? `${categoryName ?? 'Category'} — ShopCore`
    : 'Shop — ShopCore'
  const pageDesc = category
    ? (categoryData?.description ?? `Browse ${categoryName ?? 'category'} products.`)
    : 'Browse our complete collection of premium products.'

  // ── Breadcrumbs ───────────────────────────────────────────────────────────

  const breadcrumbs = category
    ? [
        { label: 'Home', href: ROUTES.HOME },
        { label: 'Shop', href: ROUTES.PRODUCTS },
        ...(categoryData?.parent?.name
          ? [{ label: categoryData.parent.name, href: buildRoute.category(categoryData.parent.slug) }]
          : []),
        ...(categoryName ? [{ label: categoryName }] : []),
      ]
    : [
        { label: 'Home', href: ROUTES.HOME },
        { label: 'Shop' },
      ]

  // ── Shared filter panel ───────────────────────────────────────────────────

  const filterPanel = (
    <ProductFilters
      filters={filters}
      onFiltersChange={(f) => handleFiltersChange(f)}
      onClear={handleClear}
      minPrice={minPrice}
      maxPrice={maxPrice}
      priceLoading={priceLoading}
      selectedCategory={category}
      onCategorySelect={handleCategorySelect}
    />
  )

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
      </Helmet>

      <PageContainer className="py-6">
        {/* ── Page heading ─────────────────────────────────────────────── */}
        <div className="mb-4">
          {category ? (
            <>
              {catLoading ? (
                <Skeleton className="h-8 w-48 mb-1" />
              ) : (
                <h1 className="text-2xl font-bold text-text-primary">{categoryName}</h1>
              )}
              {categoryData?.description && (
                <p className="mt-1 text-body-md text-text-secondary">{categoryData.description}</p>
              )}
            </>
          ) : (
            <h1 className="text-2xl font-bold text-text-primary">Shop</h1>
          )}
          <Breadcrumbs items={breadcrumbs} className="mt-1" />
        </div>

        {/* ── Toolbar ──────────────────────────────────────────────────── */}
        <div className="mb-5 flex items-center justify-between gap-3">
          <span className="text-[13px] text-text-secondary whitespace-nowrap">
            {!isLoading || isPlaceholderData
              ? (totalCount > 0 ? `Showing ${startItem}–${endItem} of ${totalCount} results` : '')
              : ''}
          </span>

          <div className="flex items-center gap-2 shrink-0">
            {/* Grid / List toggle */}
            <div className="flex items-center gap-0.5 rounded-lg border border-border p-1">
              <button
                type="button"
                title="Grid view"
                onClick={() => setViewMode('grid')}
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded transition-colors',
                  viewMode === 'grid'
                    ? 'bg-bg-subtle text-text-primary'
                    : 'text-text-tertiary hover:text-text-primary'
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                title="List view"
                onClick={() => setViewMode('list')}
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded transition-colors',
                  viewMode === 'list'
                    ? 'bg-bg-subtle text-text-primary'
                    : 'text-text-tertiary hover:text-text-primary'
                )}
              >
                <LayoutList className="h-3.5 w-3.5" />
              </button>
            </div>

            <SortDropdown value={ordering} onChange={handleSortChange} />

            {isMobile && (
              <Button variant="secondary" size="sm" onClick={() => setFilterDrawerOpen(true)}>
                <SlidersHorizontal className="h-4 w-4 mr-1.5" />
                Filters
              </Button>
            )}
          </div>
        </div>

        {/* ── Two-column layout ─────────────────────────────────────────── */}
        <div className="flex gap-6">
          {!isMobile && (
            <aside className="w-56 shrink-0 self-start sticky top-[6.75rem] max-h-[calc(100vh-7.75rem)] overflow-y-auto rounded-xl">
              {filterPanel}
            </aside>
          )}

          <div className={cn('flex-1 min-w-0 transition-opacity duration-150', isPlaceholderData && 'opacity-60')}>
            {error ? (
              <ErrorState onRetry={refetch} />
            ) : (
              <>
                <ProductGrid
                  products={data?.results ?? []}
                  isLoading={isLoading && !isPlaceholderData}
                  onClearFilters={handleClear}
                  viewMode={viewMode}
                />
                {totalPages > 1 && (
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    className="mt-8"
                  />
                )}
              </>
            )}
          </div>
        </div>
      </PageContainer>

      {/* Mobile filter drawer */}
      <Drawer
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        title="Filters"
        side="bottom"
      >
        <div className="p-4">{filterPanel}</div>
      </Drawer>
    </>
  )
}
