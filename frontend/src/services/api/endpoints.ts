// CONTRACT-ASSUMPTION: These paths are reasonable DRF defaults.
// Before deploying against a real backend, reconcile every entry here
// against the backend's live /api/schema/ or /api/docs/ OpenAPI output.
// Every call site uses this object, so path changes are a single-file update.

export const endpoints = {
  auth: {
    login: () => '/accounts/login/',
    register: () => '/accounts/register/',
    refresh: () => '/accounts/token/refresh/',
    logout: () => '/accounts/logout/',
    me: () => '/accounts/me/',
    forgotPassword: () => '/accounts/password-reset/',
    resetPassword: () => '/accounts/password-reset/confirm/',
    verifyEmail: () => '/accounts/verify-email/',
    changePassword: () => '/accounts/me/change-password/',
    deleteAccount: () => '/accounts/me/',
  },
  catalog: {
    banners: () => '/catalog/banners/',
    categories: () => '/catalog/categories/',
    categoryTree: () => '/catalog/categories/tree/',
    category: (slug: string) => `/catalog/categories/${slug}/`,
    brands: () => '/catalog/brands/',
    products: () => '/catalog/products/',
    product: (slug: string) => `/catalog/products/${slug}/`,
    reviews: (productSlug: string) => `/reviews/products/${productSlug}/reviews/`,
    reviewCreate: (productSlug: string) => `/reviews/products/${productSlug}/reviews/create/`,
    review: (reviewId: string) => `/reviews/my-reviews/${reviewId}/`,
  },
  cart: {
    detail: () => '/cart/',
    items: () => '/cart/items/',
    item: (id: string) => `/cart/items/${id}/`,
    clear: () => '/cart/clear/',
    coupon: () => '/coupons/apply/',
  },
  checkout: {
    session: () => '/checkout/session/',
    shippingMethods: () => '/checkout/shipping-methods/',
    placeOrder: () => '/checkout/place-order/',
    paymentIntent: () => '/checkout/payment-intent/',
  },
  orders: {
    list: () => '/orders/',
    detail: (orderNumber: string) => `/orders/${orderNumber}/`,
    track: () => '/orders/track/',
    cancel: (orderNumber: string) => `/orders/${orderNumber}/cancel/`,
    invoice: (orderNumber: string) => `/orders/${orderNumber}/invoice/`,
  },
  wishlist: {
    list: () => '/wishlist/',
    add: () => '/wishlist/add/',
    remove: (productId: string) => `/wishlist/remove/${productId}/`,
  },
  addresses: {
    list: () => '/addresses/',
    detail: (id: string) => `/addresses/${id}/`,
    setDefault: (id: string) => `/addresses/${id}/set-default/`,
  },
  notifications: {
    list: () => '/notifications/',
    detail: (id: string) => `/notifications/${id}/`,
    markRead: (id: string) => `/notifications/${id}/read/`,
    markAllRead: () => '/notifications/read-all/',
  },
  profile: {
    detail: () => '/profile/',
    avatar: () => '/profile/avatar/',
  },
  contact: {
    submit: () => '/contact/',
  },
  newsletter: {
    subscribe: () => '/newsletter/subscribe/',
  },
} as const
