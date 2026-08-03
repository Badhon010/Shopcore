import { createBrowserRouter, Navigate, useParams, useRouteError, isRouteErrorResponse } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { RootLayout } from '@/layouts/RootLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { AccountLayout } from '@/layouts/AccountLayout'
import { CheckoutLayout } from '@/layouts/CheckoutLayout'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { PublicOnlyRoute } from '@/routes/PublicOnlyRoute'
import { Spinner } from '@/components/feedback/Spinner'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ServerErrorPage } from '@/pages/ServerErrorPage'
import { MaintenancePage } from '@/pages/MaintenancePage'
import { OfflinePage } from '@/pages/OfflinePage'
import { buildRoute } from '@/constants/routes'
import { useAuth } from '@/contexts/AuthContext'

// Page-level lazy imports
const HomePage = lazy(() => import('@/pages/HomePage').then((m) => ({ default: m.HomePage })))
const LandingPage = lazy(() => import('@/pages/LandingPage').then((m) => ({ default: m.LandingPage })))
const SearchResultsPage = lazy(() => import('@/pages/SearchResultsPage').then((m) => ({ default: m.SearchResultsPage })))
const ProductListPage = lazy(() => import('@/pages/ProductListPage').then((m) => ({ default: m.ProductListPage })))
const ProductDetailsPage = lazy(() => import('@/pages/ProductDetailsPage').then((m) => ({ default: m.ProductDetailsPage })))
const CartPage = lazy(() => import('@/pages/CartPage').then((m) => ({ default: m.CartPage })))
const CheckoutPage = lazy(() => import('@/pages/CheckoutPage').then((m) => ({ default: m.CheckoutPage })))
const PaymentPage = lazy(() => import('@/pages/PaymentPage').then((m) => ({ default: m.PaymentPage })))
const OrderSuccessPage = lazy(() => import('@/pages/OrderSuccessPage').then((m) => ({ default: m.OrderSuccessPage })))
const OrderFailurePage = lazy(() => import('@/pages/OrderFailurePage').then((m) => ({ default: m.OrderFailurePage })))
const TrackOrderPage = lazy(() => import('@/pages/TrackOrderPage').then((m) => ({ default: m.TrackOrderPage })))
const AboutPage = lazy(() => import('@/pages/AboutPage').then((m) => ({ default: m.AboutPage })))
const ContactPage = lazy(() => import('@/pages/ContactPage').then((m) => ({ default: m.ContactPage })))
const FaqPage = lazy(() => import('@/pages/FaqPage').then((m) => ({ default: m.FaqPage })))
const TermsPage = lazy(() => import('@/pages/TermsPage').then((m) => ({ default: m.TermsPage })))
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage').then((m) => ({ default: m.PrivacyPage })))

// Auth pages
const LoginPage = lazy(() => import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import('@/pages/RegisterPage').then((m) => ({ default: m.RegisterPage })))
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })))
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })))
const VerifyEmailPage = lazy(() => import('@/pages/VerifyEmailPage').then((m) => ({ default: m.VerifyEmailPage })))

// Account pages
const ProfilePage = lazy(() => import('@/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })))
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const OrdersPage = lazy(() => import('@/pages/OrdersPage').then((m) => ({ default: m.OrdersPage })))
const OrderDetailsPage = lazy(() => import('@/pages/OrderDetailsPage').then((m) => ({ default: m.OrderDetailsPage })))
const AddressesPage = lazy(() => import('@/pages/AddressesPage').then((m) => ({ default: m.AddressesPage })))
const WishlistPage = lazy(() => import('@/pages/WishlistPage').then((m) => ({ default: m.WishlistPage })))
const NotificationsPage = lazy(() => import('@/pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage })))

function PageFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Spinner size="lg" />
    </div>
  )
}

function withSuspense(Component: React.ComponentType) {
  return (
    <Suspense fallback={<PageFallback />}>
      <Component />
    </Suspense>
  )
}

/**
 * Rendered by React Router when a route component throws an unhandled error
 * or a loader/action rejects. Replaces the raw React Router stack-trace UI.
 */
function RouterErrorBoundary() {
  const error = useRouteError()

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) return <NotFoundPage />
    return <ServerErrorPage />
  }

  console.error('[RouterErrorBoundary]', error)
  return <ServerErrorPage />
}

/**
 * Redirects legacy /category/:categorySlug URLs to the canonical
 * /products?category=<slug> query-param URL.
 */
function CategoryRedirect() {
  const { categorySlug = '' } = useParams<{ categorySlug: string }>()
  return <Navigate to={buildRoute.category(categorySlug)} replace />
}

/**
 * Redirects legacy /category/:categorySlug/:subcategorySlug URLs to the
 * parent category page (subcategories are not a separate route).
 */
function SubcategoryRedirect() {
  const { categorySlug = '' } = useParams<{ categorySlug: string; subcategorySlug: string }>()
  return <Navigate to={buildRoute.category(categorySlug)} replace />
}

/**
 * Redirects old path-based /products/category/:slug URLs to the canonical
 * query-param form /products?category=<slug>.
 */
function ProductCategoryRedirect() {
  const { slug = '' } = useParams<{ slug: string }>()
  return <Navigate to={buildRoute.category(slug)} replace />
}

/**
 * Direct /orders and /orders/:orderNumber routes:
 * Account holders go to /account/orders/:orderNumber, guests go to /track-order
 */
function OrderRedirect() {
  const { orderNumber = '' } = useParams<{ orderNumber: string }>()
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to={`/account/orders/${encodeURIComponent(orderNumber)}`} replace />
  }

  return <Navigate to={`/track-order?order_number=${encodeURIComponent(orderNumber)}`} replace />
}

function OrdersRedirect() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/account/orders" replace />
  }

  return <Navigate to="/track-order" replace />
}

export const router = createBrowserRouter([
  // Public routes under RootLayout
  {
    element: <RootLayout />,
    errorElement: <RouterErrorBoundary />,
    children: [
      { path: '/', element: withSuspense(HomePage) },
      { path: '/home', element: <Navigate to="/" replace /> },
      { path: '/lp/:campaignSlug', element: withSuspense(LandingPage) },

      // ── Legacy /category/* routes — permanent redirects to canonical URLs ──
      { path: '/category/:categorySlug', element: <CategoryRedirect /> },
      { path: '/category/:categorySlug/:subcategorySlug', element: <SubcategoryRedirect /> },

      { path: '/search', element: withSuspense(SearchResultsPage) },

      // ── Product listing — single canonical route ──────────────────────────
      // /products                   → all products
      // /products?category=<slug>   → filtered by category (and descendants)
      // Old /products/category/:slug paths are 301-redirected to query-param form.
      { path: '/products', element: withSuspense(ProductListPage) },
      { path: '/products/category/:slug', element: <ProductCategoryRedirect /> },
      { path: '/products/:productSlug', element: withSuspense(ProductDetailsPage) },

      { path: '/cart', element: withSuspense(CartPage) },
      { path: '/orders', element: <OrdersRedirect /> },
      { path: '/orders/:orderNumber', element: <OrderRedirect /> },
      { path: '/track-order', element: withSuspense(TrackOrderPage) },
      { path: '/about', element: withSuspense(AboutPage) },
      { path: '/contact', element: withSuspense(ContactPage) },
      { path: '/faq', element: withSuspense(FaqPage) },
      { path: '/terms', element: withSuspense(TermsPage) },
      { path: '/privacy', element: withSuspense(PrivacyPage) },
      { path: '/404', element: <NotFoundPage /> },

      // Account routes (protected)
      {
        path: '/account',
        element: (
          <ProtectedRoute>
            <AccountLayout />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <Navigate to="/account/profile" replace /> },
          { path: 'profile', element: withSuspense(ProfilePage) },
          { path: 'settings', element: withSuspense(SettingsPage) },
          { path: 'orders', element: withSuspense(OrdersPage) },
          { path: 'orders/:orderNumber', element: withSuspense(OrderDetailsPage) },
          { path: 'addresses', element: withSuspense(AddressesPage) },
          { path: 'wishlist', element: withSuspense(WishlistPage) },
          { path: 'notifications', element: withSuspense(NotificationsPage) },
        ],
      },

      { path: '*', element: <NotFoundPage /> },
    ],
  },

  // Auth routes (public only — redirect if already logged in)
  {
    element: (
      <PublicOnlyRoute>
        <AuthLayout />
      </PublicOnlyRoute>
    ),
    children: [
      { path: '/login', element: withSuspense(LoginPage) },
      { path: '/register', element: withSuspense(RegisterPage) },
      { path: '/forgot-password', element: withSuspense(ForgotPasswordPage) },
      { path: '/reset-password/:uid/:token', element: withSuspense(ResetPasswordPage) },
    ],
  },

  // Verify email (accessible even when logged in)
  {
    element: <AuthLayout />,
    children: [
      { path: '/verify-email/:uid/:token', element: withSuspense(VerifyEmailPage) },
    ],
  },

  // Checkout routes
  {
    element: <CheckoutLayout />,
    children: [
      { path: '/checkout', element: withSuspense(CheckoutPage) },
      { path: '/checkout/payment', element: withSuspense(PaymentPage) },
      { path: '/checkout/success/:orderNumber', element: withSuspense(OrderSuccessPage) },
      { path: '/checkout/failure', element: withSuspense(OrderFailurePage) },
    ],
  },

  // System pages
  { path: '/500', element: <ServerErrorPage /> },
  { path: '/maintenance', element: <MaintenancePage /> },
  { path: '/offline', element: <OfflinePage /> },
])
