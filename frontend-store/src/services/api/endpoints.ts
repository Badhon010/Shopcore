// All paths are relative to the axios baseURL (e.g. "/api/").
// The Vite dev-server proxy rewrites "/api" → "/api/v1" so every path here
// omits the "/v1" prefix — change baseURL in axiosClient.ts if the backend
// moves to a different version.

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
    resendVerification: () => '/accounts/resend-verification/',
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
  orders: {
    list: () => '/orders/',
    detail: (orderNumber: string) => `/orders/${orderNumber}/`,
    /** POST — place a new order. Accepts CheckoutPayload. */
    checkout: () => '/orders/checkout/',
    track: () => '/orders/track/',
    cancel: (orderNumber: string) => `/orders/${orderNumber}/cancel/`,
    invoice: (orderNumber: string) => `/orders/${orderNumber}/invoice/`,
  },
  payments: {
    /** POST — initiate payment for a placed order. Accepts { order_number, provider }. */
    initiate: () => '/payments/initiate/',
  },
  wishlist: {
    list: () => '/wishlist/',
    add: () => '/wishlist/add/',
    remove: (productId: string) => `/wishlist/remove/${productId}/`,
  },
  addresses: {
    list: () => '/accounts/addresses/',
    detail: (id: string) => `/accounts/addresses/${id}/`,
    setDefault: (id: string) => `/accounts/addresses/${id}/set-default/`,
  },
  notifications: {
    list: () => '/notifications/',
    detail: (id: string) => `/notifications/${id}/`,
    markRead: (id: string) => `/notifications/${id}/read/`,
    markAllRead: () => '/notifications/read-all/',
  },
  profile: {
    detail: () => '/accounts/me/',
    avatar: () => '/profile/avatar/',
  },
  contact: {
    submit: () => '/contact/',
  },
  newsletter: {
    subscribe: () => '/newsletter/subscribe/',
  },
} as const
