import { useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useState, useEffect, useRef } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { SearchBar } from '@/features/search/components/SearchBar'
import { ProductGrid } from '@/features/catalog/components/ProductGrid'
import { ProductFilters, DEFAULT_FILTERS, makeDefaultFilters, type FilterState } from '@/features/catalog/components/ProductFilters'
import { SortDropdown } from '@/features/catalog/components/SortDropdown'
import { Pagination } from '@/components/ui/Pagination'
import { ErrorState } from '@/components/feedback/ErrorState'
import { useProducts } from '@/features/catalog/hooks/useProducts'
import { usePriceRange } from '@/features/catalog/hooks/usePriceRange'
import { useDebounce } from '@/hooks/useDebounce'
import { APP_CONFIG } from '@/constants/config'

export function SearchResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') ?? ''
  const ordering = searchParams.get('ordering') ?? ''
  const page = parseInt(searchParams.get('page') ?? '1', 10)

  const [localQ, setLocalQ] = useState(q)
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const debouncedQ = useDebounce(localQ, 300)
  const initialized = useRef(false)

  // Sync URL → local when navigating from the nav search bar (new ?q=)
  useEffect(() => {
    setLocalQ(q)
    initialized.current = false
  }, [q])

  // Sync local → URL as user types
  useEffect(() => {
    if (debouncedQ !== q) {
      setSearchParams((prev) => {
        debouncedQ ? prev.set('q', debouncedQ) : prev.delete('q')
        prev.set('page', '1')
        return prev
      })
    }
  }, [debouncedQ, q, setSearchParams])

  const { minPrice, maxPrice, isLoading: priceLoading, isReady } = usePriceRange({ q: debouncedQ || undefined })

  // Initialize price range once actual bounds are known for this query
  useEffect(() => {
    if (isReady && !initialized.current) {
      initialized.current = true
      setFilters(makeDefaultFilters(minPrice, maxPrice))
    }
  }, [isReady, minPrice, maxPrice])

  const { data, isLoading, error, refetch } = useProducts({
    q: debouncedQ || undefined,
    ordering: ordering || undefined,
    page,
    page_size: APP_CONFIG.pagination.defaultPageSize,
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

  return (
    <>
      <Helmet>
        <title>{q ? `"${q}" — Search` : 'Search'} — ShopCore</title>
      </Helmet>
      <PageContainer className="py-8">
        <h1 className="sr-only">Search results</h1>

        <SearchBar
          defaultValue={localQ}
          onChange={setLocalQ}
          className="max-w-xl mb-6"
        />

        <div className="flex items-center justify-between mb-6">
          {q && (
            <p className="text-body-sm text-text-secondary">
              {isLoading
                ? 'Searching…'
                : `${data?.count ?? 0} result${data?.count !== 1 ? 's' : ''} for "${q}"`}
            </p>
          )}
          <SortDropdown
            value={ordering}
            onChange={(v) =>
              setSearchParams((prev) => {
                v ? prev.set('ordering', v) : prev.delete('ordering')
                prev.set('page', '1')
                return prev
              })
            }
          />
        </div>

        {error ? (
          <ErrorState onRetry={refetch} />
        ) : (
          <div className="flex gap-8">
            <aside className="hidden w-52 shrink-0 lg:block">
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
            </aside>
            <div className="flex-1 min-w-0">
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
            </div>
          </div>
        )}
      </PageContainer>
    </>
  )
}
