// All paths are relative to the axios baseURL (/api).
// Vite proxy rewrites /api → /api/v1 in development.
// Add ALL new endpoint paths here first — never construct URL strings inline.

export const endpoints = {
  // ── Auth ───────────────────────────────────────────────────
  auth: {
    login: () => '/accounts/login/',
    logout: () => '/accounts/logout/',
    refresh: () => '/accounts/token/refresh/',
    me: () => '/accounts/me/',
    changePassword: () => '/accounts/me/change-password/',
  },

  // ── Admin: Accounts ────────────────────────────────────────
  customers: {
    list: () => '/accounts/admin/users/',
    detail: (id: string) => `/accounts/admin/users/${id}/`,
  },

  // ── Admin: Catalog ─────────────────────────────────────────
  catalog: {
    // Products
    adminProducts: () => '/catalog/admin/products/',
    adminProduct: (slug: string) => `/catalog/admin/products/${slug}/`,
    adminVariants: (slug: string) => `/catalog/admin/products/${slug}/variants/`,
    adminVariant: (slug: string, pk: string) => `/catalog/admin/products/${slug}/variants/${pk}/`,
    adminImages: (slug: string) => `/catalog/admin/products/${slug}/images/`,
    adminImage: (slug: string, pk: string) => `/catalog/admin/products/${slug}/images/${pk}/`,
    // Categories
    adminCategories: () => '/catalog/admin/categories/',
    adminCategory: (pk: string) => `/catalog/admin/categories/${pk}/`,
    // Brands
    adminBrands: () => '/catalog/admin/brands/',
    adminBrand: (pk: string) => `/catalog/admin/brands/${pk}/`,
    // Banners
    adminBanners: () => '/catalog/admin/banners/',
    adminBanner: (pk: string) => `/catalog/admin/banners/${pk}/`,
    // Public (read-only lookups)
    categoryTree: () => '/catalog/categories/tree/',
  },

  // ── Admin: Orders ──────────────────────────────────────────
  orders: {
    adminList: () => '/orders/admin/',
    adminStats: () => '/orders/admin/stats/',
    detail: (orderNumber: string) => `/orders/${orderNumber}/`,
    transition: (orderNumber: string) => `/orders/${orderNumber}/transition/`,
  },

  // ── Admin: Inventory ───────────────────────────────────────
  inventory: {
    stockList: () => '/inventory/stock/',
    stockDetail: (pk: string) => `/inventory/stock/${pk}/`,
    restock: (pk: string) => `/inventory/stock/${pk}/restock/`,
    threshold: (pk: string) => `/inventory/stock/${pk}/threshold/`,
    adjust: (pk: string) => `/inventory/stock/${pk}/adjust/`,
    movements: (pk: string) => `/inventory/stock/${pk}/movements/`,
    warehouses: () => '/inventory/warehouses/',
  },

  // ── Admin: Reviews ─────────────────────────────────────────
  reviews: {
    adminList: () => '/reviews/admin/',
    adminDetail: (pk: string) => `/reviews/admin/${pk}/`,
  },

  // ── Admin: Coupons ─────────────────────────────────────────
  coupons: {
    list: () => '/coupons/',
    detail: (pk: string) => `/coupons/${pk}/`,
  },

  // ── Admin: Newsletter ──────────────────────────────────────
  newsletter: {
    adminSubscribers: () => '/newsletter/admin/subscribers/',
    adminSubscriber: (pk: string) => `/newsletter/admin/subscribers/${pk}/`,
    adminStats: () => '/newsletter/admin/stats/',
    adminCampaigns: () => '/newsletter/admin/campaigns/',
    adminCampaign: (pk: string) => `/newsletter/admin/campaigns/${pk}/`,
    adminCampaignSend: (pk: string) => `/newsletter/admin/campaigns/${pk}/send/`,
    adminCampaignDupe: (pk: string) => `/newsletter/admin/campaigns/${pk}/duplicate/`,
  },

  // ── Admin: Notifications ───────────────────────────────────
  notifications: {
    list: () => '/notifications/',
    markRead: (pk: string) => `/notifications/${pk}/read/`,
    markAllRead: () => '/notifications/read-all/',
  },

  // ── Admin: Dashboard ───────────────────────────────────────
  dashboard: {
    overview: () => '/dashboard/',
    revenue: () => '/dashboard/analytics/revenue/',
    orders: () => '/dashboard/analytics/orders/',
    bestSellers: () => '/dashboard/analytics/best-sellers/',
    customers: () => '/dashboard/analytics/customers/',
    inventory: () => '/dashboard/analytics/inventory/',
    coupons: () => '/dashboard/analytics/coupons/',
    newsletter: () => '/dashboard/analytics/newsletter/',
  },

  // ── Admin: Exports ─────────────────────────────────────────
  exports: {
    products: () => '/exports/products/',
    orders: () => '/exports/orders/',
    customers: () => '/exports/customers/',
    subscribers: () => '/exports/subscribers/',
    reviews: () => '/exports/reviews/',
    inventory: () => '/exports/inventory/',
  },

  // ── Admin: Search ──────────────────────────────────────────
  search: {
    global: () => '/search/',
  },

  // ── Admin: Uploads ─────────────────────────────────────────
  uploads: {
    file: () => '/uploads/',
  },

  // ── Admin: Contact ─────────────────────────────────────────
  contact: {
    adminMessages: () => '/contact/admin/messages/',
    adminMessage: (pk: string) => `/contact/admin/messages/${pk}/`,
    adminResolve: (pk: string) => `/contact/admin/messages/${pk}/resolve/`,
    adminMarkNew: (pk: string) => `/contact/admin/messages/${pk}/mark-new/`,
  },
} as const
