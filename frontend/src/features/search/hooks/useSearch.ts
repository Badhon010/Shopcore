import { useQuery } from '@tanstack/react-query'
import { catalogService } from '@/services/api/catalog.service'
import { queryKeys } from '@/services/queryKeys'
import { useDebounce } from '@/hooks/useDebounce'

export function useSearch(query: string) {
  const debouncedQuery = useDebounce(query, 300)

  return useQuery({
    queryKey: queryKeys.catalog.products({ q: debouncedQuery }),
    queryFn: ({ signal }) =>
      catalogService.getProducts({ q: debouncedQuery, page_size: 20 }, { signal }),
    enabled: debouncedQuery.length >= 2,
    staleTime: 30 * 1000,
  })
}

export function useSearchSuggestions(query: string) {
  const debouncedQuery = useDebounce(query, 200)

  return useQuery({
    queryKey: [...queryKeys.catalog.products({ q: debouncedQuery }), 'suggestions'],
    queryFn: ({ signal }) =>
      catalogService.getProducts({ q: debouncedQuery, page_size: 5 }, { signal }),
    enabled: debouncedQuery.length >= 2,
    staleTime: 10 * 1000,
  })
}
