import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query'
import { catalogService, type ProductListParams, type ReviewPayload } from '@/services/api/catalog.service'
import { queryKeys } from '@/services/queryKeys'
import { APP_CONFIG } from '@/constants/config'

export function useBrands() {
  return useQuery({
    queryKey: ['catalog', 'brands'],
    queryFn: ({ signal }) => catalogService.getBrands({ signal }),
    staleTime: 10 * 60 * 1000,
  })
}

export function useBanners() {
  return useQuery({
    queryKey: queryKeys.catalog.banners(),
    queryFn: ({ signal }) => catalogService.getBanners({ signal }),
    staleTime: 5 * 60 * 1000,
  })
}

export function useProducts(params: ProductListParams = {}) {
  return useQuery({
    queryKey: queryKeys.catalog.products(params),
    queryFn: ({ signal }) => catalogService.getProducts(params, { signal }),
    // Show previous page's data while the new query loads so filter changes
    // feel instant instead of flashing an empty grid (the "frozen" appearance).
    placeholderData: keepPreviousData,
    // 1-minute stale window avoids spurious re-fetches on focus/remount while
    // still keeping data reasonably fresh. Explicit invalidations (checkout,
    // cart changes) override this.
    staleTime: 60_000,
  })
}

export function useInfiniteProducts(params: ProductListParams = {}) {
  return useInfiniteQuery({
    queryKey: queryKeys.catalog.products({ ...params, infinite: true }),
    queryFn: ({ pageParam, signal }) =>
      catalogService.getProducts(
        { ...params, page: pageParam, page_size: APP_CONFIG.pagination.defaultPageSize },
        { signal }
      ),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.next) return undefined
      return allPages.length + 1
    },
  })
}

export function useProduct(slug: string) {
  return useQuery({
    queryKey: queryKeys.catalog.product(slug),
    queryFn: ({ signal }) => catalogService.getProduct(slug, { signal }),
    enabled: !!slug,
  })
}

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.catalog.categories(),
    queryFn: ({ signal }) => catalogService.getCategories({ signal }),
    staleTime: 5 * 60 * 1000, // categories rarely change
  })
}

export function useCategoryTree() {
  return useQuery({
    queryKey: queryKeys.catalog.categoryTree(),
    queryFn: ({ signal }) => catalogService.getCategoryTree({ signal }),
    staleTime: 5 * 60 * 1000,
  })
}

export function useCategory(slug: string) {
  return useQuery({
    queryKey: queryKeys.catalog.category(slug),
    queryFn: ({ signal }) => catalogService.getCategory(slug, { signal }),
    enabled: !!slug,
  })
}

export function useFeaturedProducts() {
  return useQuery({
    queryKey: queryKeys.catalog.featured(),
    queryFn: ({ signal }) => catalogService.getFeaturedProducts({ signal }),
  })
}

export function useBestsellers() {
  return useQuery({
    queryKey: queryKeys.catalog.bestsellers(),
    queryFn: ({ signal }) => catalogService.getBestsellers({ signal }),
  })
}

// Takes the product's *category* slug (there is no dedicated "related
// products" endpoint — this approximates it via same-category products).
export function useRelatedProducts(categorySlug: string) {
  return useQuery({
    queryKey: queryKeys.catalog.related(categorySlug),
    queryFn: ({ signal }) => catalogService.getRelatedProducts(categorySlug, { signal }),
    enabled: !!categorySlug,
  })
}

export function useReviews(productSlug: string, page = 1) {
  return useQuery({
    queryKey: queryKeys.catalog.reviews(productSlug, { page }),
    queryFn: ({ signal }) =>
      catalogService.getReviews(productSlug, { page, page_size: APP_CONFIG.pagination.reviewsPageSize }, { signal }),
    enabled: !!productSlug,
  })
}

export function useSubmitReview(productSlug: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ReviewPayload) => catalogService.submitReview(productSlug, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.catalog.reviews(productSlug) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.catalog.product(productSlug) })
    },
  })
}
