import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30s for catalog data
      gcTime: 5 * 60 * 1000, // 5m garbage collect
      retry: (failureCount, error) => {
        const apiError = error as { status?: number }
        // Don't retry on 4xx errors
        if (apiError?.status && apiError.status >= 400 && apiError.status < 500) {
          return false
        }
        return failureCount < 2
      },
      // DO NOT re-fetch on window focus. With focus-refetch enabled, every
      // tab-switch / DevTools click fires a burst of refetches for ALL stale
      // queries (banners, category tree, featured products, cart…), and when
      // one of those requests gets throttled the queries stay stale so the
      // NEXT focus event fires another burst — a self-sustaining loop that
      // exhausts the backend's per-IP throttle bucket (429s). Freshness is
      // handled by explicit invalidations and per-query staleTime instead.
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
})
