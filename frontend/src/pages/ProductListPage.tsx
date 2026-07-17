import { useSearchParams } from 'react-router-dom'
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
import { useProducts } from '@/features/catalog/hooks/useProducts'
import { usePriceRange } from '@/features/catalog/hooks/usePriceRange'
import { APP_CONFIG } from '@/constants/config'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/utils/cn'
import { ROUTES } from '@/constants/routes'

export function ProductListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const isMobile = !useMediaQuery('(min-width: 1024px)')

  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const ordering = searchParams.get('ordering') ?? ''
  const selectedCategory = searchParams.get('category') ?? undefined

  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const initialized = useRef(false)

  // Re-init price range when category changes
  useEffect(() => {
    initialized.current = false
  }, [selectedCategory])

  const { minPrice, maxPrice, isLoading: priceLoading, isReady } = usePriceRange({
    category: selectedCategory,
  })

  useEffect(() => {
    if (isReady && !initialized.current) {
      initialized.current = true
      setFilters(makeDefaultFilters(minPrice, maxPrice))
    }
  }, [isReady, minPrice, maxPrice])

  const brandsParam =
    filters.brands.length > 0 ? filters.brands.join(',') : undefined

  const { data, isLoading, error, refetch } = useProducts({
    page,
    page_size: APP_CONFIG.pagination.defaultPageSize,
    ordering: ordering || undefined,
    in_stock: filters.inStockOnly || undefined,
    price_min: isReady && filters.priceRange[0] > minPrice ? filters.priceRange[0] : undefined,
    price_max: isReady && filters.priceRange[1] < maxPrice ? filters.priceRange[1] : undefined,
    category: selectedCategory,
    brands: brandsParam,
    min_rating: filters.minRating > 0 ? filters.minRating : undefined,
  })

  const totalCount = data?.count ?? 0
  const totalPages = Math.ceil(totalCount / APP_CONFIG.pagination.defaultPageSize)
  const pageSize = APP_CONFIG.pagination.defaultPageSize
  const startItem = totalCount > 0 ? (page - 1) * pageSize + 1 : 0
  const endItem = Math.min(page * pageSize, totalCount)

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

  const handleCategorySelect = (slug: string | undefined) => {
    initialized.current = false
    setFilters((f) => ({ ...f, priceRange: [0, 0] }))
    setSearchParams((prev) => {
      slug ? prev.set('category', slug) : prev.delete('category')
      prev.set('page', '1')
      return prev
    })
  }

  const handleClear = () => {
    setFilters(makeDefaultFilters(minPrice, maxPrice))
    setSearchParams((prev) => {
      prev.set('page', '1')
      prev.delete('category')
      return prev
    })
  }

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
      selectedCategory={selectedCategory}
      onCategorySelect={handleCategorySelect}
    />
  )

  return (
    <>
      <Helmet>
        <title>Shop — ShopCore</title>
        <meta name="description" content="Browse our complete collection of premium products." />
      </Helmet>

      <PageContainer className="py-6">
        {/* ── Page heading ── */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-text-primary">Shop</h1>
          <Breadcrumbs
            items={[
              { label: 'Home', href: ROUTES.HOME },
              { label: 'Shop' },
            ]}
            className="mt-1"
          />
        </div>

        {/* ── Toolbar: results count | controls ── */}
        <div className="mb-5 flex items-center justify-between gap-3">
          {/* Results count */}
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
                  viewMode === 'grid' ? 'bg-bg-subtle text-text-primary' : 'text-text-tertiary hover:text-text-primary'
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
                  viewMode === 'list' ? 'bg-bg-subtle text-text-primary' : 'text-text-tertiary hover:text-text-primary'
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

        {/* ── Two-column layout ── */}
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
