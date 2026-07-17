import type { ListParams } from '@/types/api'

// Central query key factory.
// Every useQuery / useInfiniteQuery call in the app must use these keys.
export const queryKeys = {
  auth: {
    me: () => ['auth', 'me'] as const,
  },
  catalog: {
    banners: () => ['catalog', 'banners'] as const,
    categories: () => ['catalog', 'categories'] as const,
    categoryTree: () => ['catalog', 'categories', 'tree'] as const,
    category: (slug: string) => ['catalog', 'category', slug] as const,
    products: (params?: ListParams & Record<string, unknown>) =>
      ['catalog', 'products', params ?? {}] as const,
    product: (slug: string) => ['catalog', 'product', slug] as const,
    reviews: (productSlug: string, params?: ListParams) =>
      ['catalog', 'reviews', productSlug, params ?? {}] as const,
    featured: () => ['catalog', 'products', 'featured'] as const,
    bestsellers: () => ['catalog', 'products', 'bestsellers'] as const,
    related: (slug: string) => ['catalog', 'related', slug] as const,
  },
  cart: {
    detail: () => ['cart'] as const,
  },
  checkout: {
    session: () => ['checkout', 'session'] as const,
    shippingMethods: () => ['checkout', 'shipping-methods'] as const,
  },
  orders: {
    list: (params?: ListParams & Record<string, unknown>) =>
      ['orders', params ?? {}] as const,
    detail: (orderNumber: string) => ['orders', orderNumber] as const,
  },
  wishlist: {
    list: () => ['wishlist'] as const,
  },
  addresses: {
    list: () => ['addresses'] as const,
    detail: (id: string) => ['addresses', id] as const,
  },
  notifications: {
    list: (params?: ListParams) => ['notifications', params ?? {}] as const,
  },
  profile: {
    detail: () => ['profile'] as const,
  },
}
