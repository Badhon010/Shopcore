import { axiosClient } from './axiosClient'
import { endpoints } from './endpoints'
import { normalizeCategory, normalizeProduct } from './normalizers'
import type { Banner, Brand, Category, Product, Review } from '@/types/models'
import type { PaginatedResponse, ListParams } from '@/types/api'

export interface ProductListParams extends ListParams {
  category?: string
  subcategory?: string
  q?: string
  price_min?: number
  price_max?: number
  in_stock?: boolean
  ordering?: string
  brand?: string
  brands?: string        // comma-separated brand slugs for multi-select
  min_rating?: number
  attributes?: Record<string, string[]>
}

export interface ReviewPayload {
  rating: number
  title?: string
  body: string
}

// Pagination adapter — isolates DRF {count, next, previous, results} shape.
// If the backend uses cursor pagination, update this function only.
function toPaginated<T>(data: PaginatedResponse<T>) {
  return data
}

export const catalogService = {
  // Homepage hero slider slides — not paginated on the backend.
  getBanners: ({ signal }: { signal?: AbortSignal } = {}) =>
    axiosClient.get<Banner[]>(endpoints.catalog.banners(), { signal }).then((r) => r.data),

  // The category list endpoint is paginated like everything else in DRF —
  // unwrap `results` so callers get a plain array.
  getCategories: ({ signal }: { signal?: AbortSignal } = {}) =>
    axiosClient
      .get<PaginatedResponse<Category>>(endpoints.catalog.categories(), { signal })
      .then((r) => r.data.results.map(normalizeCategory)),

  getBrands: ({ signal }: { signal?: AbortSignal } = {}) =>
    axiosClient
      .get<PaginatedResponse<Brand>>(endpoints.catalog.brands(), { signal })
      .then((r) => r.data.results ?? (r.data as unknown as Brand[])),

  getCategory: (slug: string, { signal }: { signal?: AbortSignal } = {}) =>
    axiosClient
      .get<Category>(endpoints.catalog.category(slug), { signal })
      .then((r) => normalizeCategory(r.data)),

  // Full nested category tree (root categories with their children), used
  // for navigation/category-picker UI where the flat root-only list from
  // getCategories() isn't granular enough.
  getCategoryTree: ({ signal }: { signal?: AbortSignal } = {}) =>
    axiosClient
      .get<Category[]>(endpoints.catalog.categoryTree(), { signal })
      .then((r) => r.data.map(normalizeCategory)),

  getProducts: (
    params: ProductListParams = {},
    { signal }: { signal?: AbortSignal } = {}
  ) =>
    axiosClient
      .get<PaginatedResponse<Product>>(endpoints.catalog.products(), { params, signal })
      .then((r) => toPaginated(r.data))
      .then((data) => ({ ...data, results: data.results.map(normalizeProduct) })),

  getProduct: (slug: string, { signal }: { signal?: AbortSignal } = {}) =>
    axiosClient
      .get<Product>(endpoints.catalog.product(slug), { signal })
      .then((r) => normalizeProduct(r.data)),

  // No dedicated "featured" endpoint on the backend — the product list
  // endpoint supports an `is_featured` filter instead.
  getFeaturedProducts: ({ signal }: { signal?: AbortSignal } = {}) =>
    axiosClient
      .get<PaginatedResponse<Product>>(endpoints.catalog.products(), {
        params: { is_featured: true },
        signal,
      })
      .then((r) => ({ ...r.data, results: r.data.results.map(normalizeProduct) })),

  // No dedicated "bestsellers" endpoint — approximate with rating ordering.
  getBestsellers: ({ signal }: { signal?: AbortSignal } = {}) =>
    axiosClient
      .get<PaginatedResponse<Product>>(endpoints.catalog.products(), {
        params: { ordering: '-average_rating' },
        signal,
      })
      .then((r) => ({ ...r.data, results: r.data.results.map(normalizeProduct) })),

  // No dedicated "related products" endpoint — approximate using the
  // product's own category once it has been fetched.
  getRelatedProducts: (categorySlug: string, { signal }: { signal?: AbortSignal } = {}) =>
    axiosClient
      .get<PaginatedResponse<Product>>(endpoints.catalog.products(), {
        params: { category: categorySlug, page_size: 8 },
        signal,
      })
      .then((r) => r.data.results.map(normalizeProduct)),

  getReviews: (
    productSlug: string,
    params: ListParams = {},
    { signal }: { signal?: AbortSignal } = {}
  ) =>
    axiosClient
      .get<PaginatedResponse<Review>>(endpoints.catalog.reviews(productSlug), { params, signal })
      .then((r) => toPaginated(r.data)),

  submitReview: (productSlug: string, payload: ReviewPayload) =>
    axiosClient
      .post<Review>(endpoints.catalog.reviewCreate(productSlug), payload)
      .then((r) => r.data),

  deleteReview: (_productSlug: string, reviewId: string) =>
    axiosClient
      .delete(endpoints.catalog.review(reviewId))
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      .then((r) => r.data),
}
