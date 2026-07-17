import { useProducts } from './useProducts'
import type { ProductListParams } from '@/services/api/catalog.service'

type PriceContext = Pick<ProductListParams, 'category' | 'subcategory' | 'q'>

/**
 * Fetches the actual min and max prices for the current context (category, search, etc.)
 * by making two lightweight queries — one sorted ascending, one descending — each page_size=1.
 */
export function usePriceRange(context: PriceContext = {}) {
  const baseParams: ProductListParams = {
    ...context,
    page_size: 1,
  }

  const minQ = useProducts({ ...baseParams, ordering: 'base_price' })
  const maxQ = useProducts({ ...baseParams, ordering: '-base_price' })

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
