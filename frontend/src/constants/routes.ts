export const ROUTES = {
  HOME: '/',
  LANDING: '/lp/:campaignSlug',
  CATEGORY: '/category/:categorySlug',
  SUBCATEGORY: '/category/:categorySlug/:subcategorySlug',
  SEARCH: '/search',
  PRODUCTS: '/products',
  PRODUCT_DETAILS: '/products/:productSlug',
  ABOUT: '/about',
  CONTACT: '/contact',
  FAQ: '/faq',
  TERMS: '/terms',
  PRIVACY: '/privacy',
  TRACK_ORDER: '/track-order',

  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password/:uid/:token',
  VERIFY_EMAIL: '/verify-email/:uid/:token',

  CART: '/cart',
  CHECKOUT: '/checkout',
  CHECKOUT_PAYMENT: '/checkout/payment',
  CHECKOUT_SUCCESS: '/checkout/success/:orderNumber',
  CHECKOUT_FAILURE: '/checkout/failure',

  ACCOUNT: '/account',
  ACCOUNT_PROFILE: '/account/profile',
  ACCOUNT_SETTINGS: '/account/settings',
  ACCOUNT_ORDERS: '/account/orders',
  ACCOUNT_ORDER_DETAILS: '/account/orders/:orderNumber',
  ACCOUNT_ADDRESSES: '/account/addresses',
  ACCOUNT_WISHLIST: '/account/wishlist',
  ACCOUNT_NOTIFICATIONS: '/account/notifications',

  NOT_FOUND: '/404',
  SERVER_ERROR: '/500',
  MAINTENANCE: '/maintenance',
  OFFLINE: '/offline',
} as const

export const buildRoute = {
  category: (slug: string) => `/category/${slug}`,
  subcategory: (categorySlug: string, subcategorySlug: string) =>
    `/category/${categorySlug}/${subcategorySlug}`,
  product: (slug: string) => `/products/${slug}`,
  orderSuccess: (orderNumber: string) => `/checkout/success/${orderNumber}`,
  orderDetails: (orderNumber: string) => `/account/orders/${orderNumber}`,
  resetPassword: (uid: string, token: string) => `/reset-password/${uid}/${token}`,
  verifyEmail: (uid: string, token: string) => `/verify-email/${uid}/${token}`,
  landing: (campaignSlug: string) => `/lp/${campaignSlug}`,
}
