export const ROUTES = {
  // Auth
  LOGIN:           '/login',
  UNAUTHORIZED:    '/unauthorized',

  // Dashboard
  DASHBOARD:       '/',

  // Catalog
  PRODUCTS:        '/catalog/products',
  PRODUCT_DETAIL:  (slug: string) => `/catalog/products/${slug}`,
  CATEGORIES:      '/catalog/categories',
  BRANDS:          '/catalog/brands',
  INVENTORY:       '/catalog/inventory',
  BANNERS:         '/catalog/banners',

  // Orders
  ORDERS:          '/orders',
  ORDER_DETAIL:    (orderNumber: string) => `/orders/${orderNumber}`,

  // Customers
  CUSTOMERS:       '/customers',
  CUSTOMER_DETAIL: (id: string) => `/customers/${id}`,

  // Engagement
  COUPONS:         '/coupons',
  REVIEWS:         '/reviews',
  MARKETING:       '/marketing',
  CONTACT:         '/contact',

  // Analytics & Settings
  ANALYTICS:       '/analytics',
  NOTIFICATIONS:   '/notifications',
  SETTINGS:        '/settings',
} as const
