import { useParams, useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useState, useEffect, useRef } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { ProductGrid } from '@/features/catalog/components/ProductGrid'
import { ProductFilters, DEFAULT_FILTERS, makeDefaultFilters, type FilterState } from '@/features/catalog/components/ProductFilters'
import { SortDropdown } from '@/features/catalog/components/SortDropdown'
import { Pagination } from '@/components/ui/Pagination'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { ErrorState } from '@/components/feedback/ErrorState'
import { Skeleton } from '@/components/feedback/Skeleton'
import { useProducts, useCategory } from '@/features/catalog/hooks/useProducts'
import { usePriceRange } from '@/features/catalog/hooks/usePriceRange'
import { APP_CONFIG } from '@/constants/config'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { ROUTES } from '@/constants/routes'

export function CategoryPage() {
  const { categorySlug = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const isMobile = !useMediaQuery('(min-width: 1024px)')
  const initialized = useRef(false)

  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const ordering = searchParams.get('ordering') ?? ''

  const { minPrice, maxPrice, isLoading: priceLoading, isReady } = usePriceRange({ category: categorySlug })

  // Initialize price range from actual data bounds (once per category)
  useEffect(() => {
    initialized.current = false
  }, [categorySlug])

  useEffect(() => {
    if (isReady && !initialized.current) {
      initialized.current = true
      setFilters(makeDefaultFilters(minPrice, maxPrice))
    }
  }, [isReady, minPrice, maxPrice])

  const { data: category, isLoading: catLoading } = useCategory(categorySlug)
  const { data, isLoading, error, refetch } = useProducts({
    category: categorySlug,
    page,
    page_size: APP_CONFIG.pagination.defaultPageSize,
    ordering: ordering || undefined,
    in_stock: filters.inStockOnly || undefined,
    price_min: isReady && filters.priceRange[0] > minPrice ? filters.priceRange[0] : undefined,
    price_max: isReady && filters.priceRange[1] < maxPrice ? filters.priceRange[1] : undefined,
  })

  const totalPages = Math.ceil((data?.count ?? 0) / APP_CONFIG.pagination.defaultPageSize)

  const handlePageChange = (p: number) => {
    setSearchParams((prev) => { prev.set('page', String(p)); return prev })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleClear = () => {
    setFilters(makeDefaultFilters(minPrice, maxPrice))
    setSearchParams((prev) => { prev.set('page', '1'); return prev })
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
    />
  )

  return (
    <>
      <Helmet>
        <title>{category?.name ?? 'Category'} — ShopCore</title>
        <meta name="description" content={category?.description ?? `Browse ${category?.name} products.`} />
      </Helmet>
      <PageContainer className="py-8">
        <Breadcrumbs
          items={[{ label: 'Home', href: ROUTES.HOME }, { label: category?.name ?? '…' }]}
          className="mb-4"
        />

        <div className="mb-8">
          {catLoading ? (
            <Skeleton className="h-8 w-48" />
          ) : (
            <h1 className="text-heading-xl font-semibold text-text-primary">{category?.name}</h1>
          )}
          {category?.description && (
            <p className="mt-2 text-body-md text-text-secondary">{category.description}</p>
          )}
        </div>

        <div className="flex items-center justify-between mb-6">
          <p className="text-body-sm text-text-secondary">{data?.count ?? 0} products</p>
          <div className="flex items-center gap-3">
            {isMobile && (
              <Button variant="secondary" size="sm" onClick={() => setFilterDrawerOpen(true)}>
                <SlidersHorizontal className="h-4 w-4" />
                Filters
              </Button>
            )}
            <SortDropdown
              value={ordering}
              onChange={(v) =>
                setSearchParams((prev) => {
                  v ? prev.set('ordering', v) : prev.delete('ordering')
                  return prev
                })
              }
            />
          </div>
        </div>

        <div className="flex gap-8">
          {!isMobile && <aside className="w-56 shrink-0">{filterPanel}</aside>}
          <div className="flex-1 min-w-0">
            {error ? (
              <ErrorState onRetry={refetch} />
            ) : (
              <>
                <ProductGrid
                  products={data?.results ?? []}
                  isLoading={isLoading}
                  onClearFilters={handleClear}
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

      <Drawer open={filterDrawerOpen} onClose={() => setFilterDrawerOpen(false)} title="Filters" side="bottom">
        <div className="p-6">{filterPanel}</div>
      </Drawer>
    </>
  )
}
