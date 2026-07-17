import { ROUTES } from '@/constants/routes'

export interface RouteMetadata {
  path: string
  title: string
  requiresAuth: boolean
  publicOnly?: boolean
}

export const routeMetadata: RouteMetadata[] = [
  { path: ROUTES.HOME, title: 'ShopCore — Premium Store', requiresAuth: false },
  { path: ROUTES.PRODUCTS, title: 'All Products', requiresAuth: false },
  { path: ROUTES.SEARCH, title: 'Search Results', requiresAuth: false },
  { path: ROUTES.CART, title: 'Your Cart', requiresAuth: false },
  { path: ROUTES.CHECKOUT, title: 'Checkout', requiresAuth: false },
  { path: ROUTES.TRACK_ORDER, title: 'Track Your Order', requiresAuth: false },
  { path: ROUTES.LOGIN, title: 'Sign In', requiresAuth: false, publicOnly: true },
  { path: ROUTES.REGISTER, title: 'Create Account', requiresAuth: false, publicOnly: true },
  { path: ROUTES.FORGOT_PASSWORD, title: 'Reset Password', requiresAuth: false, publicOnly: true },
  { path: ROUTES.ACCOUNT, title: 'My Account', requiresAuth: true },
  { path: ROUTES.ACCOUNT_ORDERS, title: 'My Orders', requiresAuth: true },
  { path: ROUTES.ACCOUNT_ADDRESSES, title: 'My Addresses', requiresAuth: true },
  { path: ROUTES.ACCOUNT_WISHLIST, title: 'My Wishlist', requiresAuth: true },
  { path: ROUTES.ACCOUNT_NOTIFICATIONS, title: 'Notifications', requiresAuth: true },
]
