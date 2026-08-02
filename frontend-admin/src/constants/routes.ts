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

  // Payments
  PAYMENT_METHODS:  '/payments/methods',
  PAYMENT_SUBMISSIONS: '/payments/submissions',

  // Customers
  CUSTOMERS:       '/customers',
  CUSTOMER_DETAIL: (id: string) => `/customers/${id}`,

  // Engagement
  COUPONS:         '/coupons',
  REVIEWS:         '/reviews',
  MARKETING:       '/marketing',
  CONTACT:         '/contact',

  // Analytics, Settings & Exports
  ANALYTICS:       '/analytics',
  NOTIFICATIONS:   '/notifications',
  SETTINGS:        '/settings',
  EXPORTS:         '/exports',
} as const
