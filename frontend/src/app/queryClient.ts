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
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
})
