import { axiosClient } from './axiosClient'
import { endpoints } from './endpoints'
import { normalizeWishlistItem } from './normalizers'
import type { WishlistItem } from '@/types/models'
import type { PaginatedResponse } from '@/types/api'

export const wishlistService = {
  // The wishlist list endpoint is paginated like everything else in DRF —
  // unwrap `results` so callers get a plain array.
  getWishlist: ({ signal }: { signal?: AbortSignal } = {}) =>
    axiosClient
      .get<PaginatedResponse<WishlistItem>>(endpoints.wishlist.list(), { signal })
      .then((r) => r.data.results.map(normalizeWishlistItem)),

  addItem: (productId: string) =>
    axiosClient
      .post<WishlistItem>(endpoints.wishlist.add(), { product_id: productId })
      .then((r) => normalizeWishlistItem(r.data)),

  removeItem: (productId: string) =>
    axiosClient
      .delete(endpoints.wishlist.remove(productId))
      .then((r) => r.data),
}
