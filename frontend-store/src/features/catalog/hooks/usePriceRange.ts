import { useQuery } from '@tanstack/react-query'
import { catalogService, type ProductListParams } from '@/services/api/catalog.service'

type PriceContext = Pick<ProductListParams, 'category' | 'subcategory' | 'q'>

/**
 * Fetches price bounds (slider min/max) for the current category/context.
 *
 * Uses two lightweight page_size=1 queries — one sorted ascending for the
 * floor, one descending for the ceiling.
 *
 * These queries use staleTime: Infinity because price bounds for a given
 * category change only when products are added or repriced, which is rare.
 * Using Infinity avoids the previous behaviour where two extra full product-
 * list round-trips fired every 60 seconds alongside the main products query.
 * The gcTime (5 min default) still evicts the cache after the component
 * unmounts, so a browser refresh always gets fresh bounds.
 */
export function usePriceRange(context: PriceContext = {}) {
  const baseParams: ProductListParams = { ...context, page_size: 1 }

  const minQ = useQuery({
    queryKey: ['catalog', 'priceRange', 'min', context],
    queryFn: ({ signal }) =>
      catalogService.getProducts({ ...baseParams, ordering: 'base_price' }, { signal }),
    staleTime: Infinity, // price bounds rarely change — never re-fetch while mounted
  })

  const maxQ = useQuery({
    queryKey: ['catalog', 'priceRange', 'max', context],
    queryFn: ({ signal }) =>
      catalogService.getProducts({ ...baseParams, ordering: '-base_price' }, { signal }),
    staleTime: Infinity,
  })

  const rawMin = minQ.data?.results[0]?.price
  const rawMax = maxQ.data?.results[0]?.price

  const minPrice = rawMin !== undefined ? Math.floor(parseFloat(rawMin)) : 0
  const maxPrice = rawMax !== undefined ? Math.ceil(parseFloat(rawMax)) : 0

  return {
    minPrice,
    maxPrice,
    isLoading: minQ.isLoading || maxQ.isLoading,
    isReady: !minQ.isLoading && !maxQ.isLoading && maxPrice > 0,
  }
}
