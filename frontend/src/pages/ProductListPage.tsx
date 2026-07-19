/**
 * ProductListPage — the single canonical product listing page.
 *
 * Operates in two modes depending on the matched route:
 *   Mode 1  /products                     — all products, no category filter
 *   Mode 2  /products/category/:slug      — products filtered to one category
 *
 * Backward compatibility
 *   /products?category=<slug>  →  <Navigate to="/products/category/<slug>" replace />
 *   Old /category/:slug links  →  handled by redirect routes in router.tsx
 */
import { useParams, useSearchParams, useNavigate, Navigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { SlidersHorizontal, LayoutGrid, LayoutList } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { ProductGrid } from '@/features/catalog/components/ProductGrid'
import {
  ProductFilters,
  DEFAULT_FILTERS,
  makeDefaultFilters,
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
  // Mode 2: category slug from URL params (undefined when on /products)
  const { slug } = useParams<{ slug?: string }>()

  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const isMobile = !useMediaQuery('(min-width: 1024px)')

  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const initialized = useRef(false)

  // Re-initialise price range whenever the category changes
  useEffect(() => {
    initialized.current = false
  }, [slug])

  const { minPrice, maxPrice, isLoading: priceLoading, isReady } = usePriceRange({
    category: slug,
  })

  useEffect(() => {
    if (isReady && !initialized.current) {
      initialized.current = true
      setFilters(makeDefaultFilters(minPrice, maxPrice))
    }
  }, [isReady, minPrice, maxPrice])

  // Fetch category metadata (name, description) when in category mode
  const { data: category, isLoading: catLoading } = useCategory(slug ?? '')

  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const ordering = searchParams.get('ordering') ?? ''
  const brandsParam = filters.brands.length > 0 ? filters.brands.join(',') : undefined

  const { data, isLoading, error, refetch } = useProducts({
    page,
    page_size: APP_CONFIG.pagination.defaultPageSize,
    ordering: ordering || undefined,
    in_stock: filters.inStockOnly || undefined,
    price_min: isReady && filters.priceRange[0] > minPrice ? filters.priceRange[0] : undefined,
    price_max: isReady && filters.priceRange[1] < maxPrice ? filters.priceRange[1] : undefined,
    category: slug,
    brands: brandsParam,
    min_rating: filters.minRating > 0 ? filters.minRating : undefined,
  })

  const totalCount = data?.count ?? 0
  const totalPages = Math.ceil(totalCount / APP_CONFIG.pagination.defaultPageSize)
  const pageSize = APP_CONFIG.pagination.defaultPageSize
  const startItem = totalCount > 0 ? (page - 1) * pageSize + 1 : 0
  const endItem = Math.min(page * pageSize, totalCount)

  // ── Backward compat: /products?category=X → /products/category/X ──────────
  // All hooks are called above — safe to return Navigate after them.
  const legacyCategoryParam = searchParams.get('category')
  if (legacyCategoryParam) {
    return <Navigate to={buildRoute.category(legacyCategoryParam)} replace />
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
   * Category selection from the sidebar filter panel.
   * Navigates to the canonical URL instead of mutating search params so the
   * URL always reflects the chosen category and the browser history is correct.
   */
  const handleCategorySelect = (selectedSlug: string | undefined) => {
    if (selectedSlug) {
      navigate(buildRoute.category(selectedSlug))
    } else {
      navigate(ROUTES.PRODUCTS)
    }
  }

  const handleClear = () => {
    setFilters(makeDefaultFilters(minPrice, maxPrice))
    setSearchParams((prev) => { prev.set('page', '1'); return prev })
  }

  // ── SEO ───────────────────────────────────────────────────────────────────

  const categoryName = category?.name
  const pageTitle = slug
    ? `${categoryName ?? 'Category'} — ShopCore`
    : 'Shop — ShopCore'
  const pageDesc = slug
    ? (category?.description ?? `Browse ${categoryName ?? 'category'} products.`)
    : 'Browse our complete collection of premium products.'

  // ── Breadcrumbs ───────────────────────────────────────────────────────────

  const breadcrumbs = slug
    ? [
        { label: 'Home', href: ROUTES.HOME },
        { label: 'Shop', href: ROUTES.PRODUCTS },
        { label: categoryName ?? '…' },
      ]
    : [
        { label: 'Home', href: ROUTES.HOME },
        { label: 'Shop' },
      ]

  // ── Shared filter panel ───────────────────────────────────────────────────

  const filterPanel = (
    <ProductFilters
      filters={filters}
      onFiltersChange={(f) => {
        setFilters(f)
        setSearchParams((prev) => { prev.set('page', '1'); return prev })
      }}
      onClear={handleClear}
      minPrice={minPrice}
      maxPrice={maxPrice}
      priceLoading={priceLoading}
      selectedCategory={slug}
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
          {slug ? (
            <>
              {catLoading ? (
                <Skeleton className="h-8 w-48 mb-1" />
              ) : (
                <h1 className="text-2xl font-bold text-text-primary">{categoryName}</h1>
              )}
              {category?.description && (
                <p className="mt-1 text-body-md text-text-secondary">{category.description}</p>
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
            {isLoading
              ? 'Loading…'
              : totalCount > 0
              ? `Showing ${startItem}–${endItem} of ${totalCount} results`
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

          <div className="flex-1 min-w-0">
            {error ? (
              <ErrorState onRetry={refetch} />
            ) : (
              <>
                <ProductGrid
                  products={data?.results ?? []}
                  isLoading={isLoading}
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
