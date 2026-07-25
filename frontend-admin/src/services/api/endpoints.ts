export const endpoints = {
  auth: {
    login: () => '/accounts/login/',
    refresh: () => '/accounts/token/refresh/',
    logout: () => '/accounts/logout/',
    me: () => '/accounts/me/',
    changePassword: () => '/accounts/me/change-password/',
  },
  catalog: {
    products: () => '/catalog/products/',
    product: (slug: string) => `/catalog/products/${slug}/`,
    categories: () => '/catalog/categories/',
    category: (id: number) => `/catalog/categories/${id}/`,
    categoryTree: () => '/catalog/categories/tree/',
    brands: () => '/catalog/brands/',
    brand: (id: number) => `/catalog/brands/${id}/`,
    banners: () => '/catalog/banners/',
    banner: (id: number) => `/catalog/banners/${id}/`,
  },
  orders: {
    list: () => '/orders/',
    detail: (orderNumber: string) => `/orders/${orderNumber}/`,
    transition: (orderNumber: string) => `/orders/${orderNumber}/transition/`,
    cancel: (orderNumber: string) => `/orders/${orderNumber}/cancel/`,
    adminList: () => '/orders/admin/',
  },
  inventory: {
    stock: () => '/inventory/stock/',
    stockItem: (id: number) => `/inventory/stock/${id}/`,
    restock: (id: number) => `/inventory/stock/${id}/restock/`,
  },
  customers: {
    list: () => '/accounts/admin/users/',
    detail: (id: string) => `/accounts/admin/users/${id}/`,
  },
  reviews: {
    adminList: () => '/reviews/admin/',
    adminDetail: (id: number) => `/reviews/admin/${id}/`,
    productReviews: (slug: string) => `/reviews/products/${slug}/reviews/`,
  },
  coupons: {
    list: () => '/coupons/',
    create: () => '/coupons/',
    detail: (id: number) => `/coupons/${id}/`,
  },
  newsletter: {
    subscribe: () => '/newsletter/subscribe/',
    adminSubscribers: () => '/newsletter/admin/subscribers/',
    adminSubscriber: (id: number) => `/newsletter/admin/subscribers/${id}/`,
  },
  notifications: {
    list: () => '/notifications/',
    markRead: (id: number) => `/notifications/${id}/read/`,
    markAllRead: () => '/notifications/read-all/',
  },
} as const
