import { createBrowserRouter, useRouteError, isRouteErrorResponse } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AdminLayout } from '@/layouts/AdminLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { AdminOnlyRoute } from '@/routes/AdminOnlyRoute'
import { PublicOnlyRoute } from '@/routes/PublicOnlyRoute'
import { LoadingScreen } from '@/components/layout/LoadingScreen'
import { ErrorState } from '@/components/feedback/ErrorState'
import { ROUTES } from '@/constants/routes'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { UnauthorizedPage } from '@/pages/UnauthorizedPage'

// Lazy page imports
const LoginPage         = lazy(() => import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })))
const DashboardPage     = lazy(() => import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const ProductsPage      = lazy(() => import('@/pages/catalog/ProductsPage').then((m) => ({ default: m.ProductsPage })))
const ProductDetailPage = lazy(() => import('@/pages/catalog/ProductDetailPage').then((m) => ({ default: m.ProductDetailPage })))
const CategoriesPage    = lazy(() => import('@/pages/catalog/CategoriesPage').then((m) => ({ default: m.CategoriesPage })))
const BrandsPage        = lazy(() => import('@/pages/catalog/BrandsPage').then((m) => ({ default: m.BrandsPage })))
const InventoryPage     = lazy(() => import('@/pages/catalog/InventoryPage').then((m) => ({ default: m.InventoryPage })))
const BannersPage       = lazy(() => import('@/pages/catalog/BannersPage').then((m) => ({ default: m.BannersPage })))
const OrdersPage        = lazy(() => import('@/pages/orders/OrdersPage').then((m) => ({ default: m.OrdersPage })))
const OrderDetailPage   = lazy(() => import('@/pages/orders/OrderDetailPage').then((m) => ({ default: m.OrderDetailPage })))
const PaymentMethodsPage = lazy(() => import('@/pages/payments/PaymentMethodsPage').then((m) => ({ default: m.PaymentMethodsPage })))
const PaymentSubmissionsPage = lazy(() => import('@/pages/payments/PaymentSubmissionsPage').then((m) => ({ default: m.PaymentSubmissionsPage })))
const CustomersPage     = lazy(() => import('@/pages/customers/CustomersPage').then((m) => ({ default: m.CustomersPage })))
const CustomerDetailPage= lazy(() => import('@/pages/customers/CustomerDetailPage').then((m) => ({ default: m.CustomerDetailPage })))
const CouponsPage       = lazy(() => import('@/pages/coupons/CouponsPage').then((m) => ({ default: m.CouponsPage })))
const ReviewsPage       = lazy(() => import('@/pages/reviews/ReviewsPage').then((m) => ({ default: m.ReviewsPage })))
const MarketingPage     = lazy(() => import('@/pages/marketing/MarketingPage').then((m) => ({ default: m.MarketingPage })))
const ContactPage       = lazy(() => import('@/pages/ContactPage').then((m) => ({ default: m.ContactPage })))
const AnalyticsPage     = lazy(() => import('@/pages/analytics/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })))
const NotificationsPage = lazy(() => import('@/pages/notifications/NotificationsPage').then((m) => ({ default: m.NotificationsPage })))
const SettingsPage      = lazy(() => import('@/pages/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const ExportsPage       = lazy(() => import('@/pages/exports/ExportsPage').then((m) => ({ default: m.ExportsPage })))

function PageFallback() {
  return <LoadingScreen label="Loading page…" />
}

function wrap(Component: React.ComponentType) {
  return (
    <Suspense fallback={<PageFallback />}>
      <Component />
    </Suspense>
  )
}

function RouterErrorBoundary() {
  const error = useRouteError()
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />
  if (isRouteErrorResponse(error) && error.status === 403) return <UnauthorizedPage />
  return (
    <div className="container-page py-10">
      <ErrorState
        title="Something went wrong"
        description="An unexpected error occurred while rendering this page. Try reloading, or return to the dashboard."
        onRetry={() => window.location.reload()}
      />
    </div>
  )
}

export const router = createBrowserRouter([
  // ── Auth routes ──────────────────────────────────────
  {
    path: ROUTES.LOGIN,
    errorElement: <RouterErrorBoundary />,
    element: (
      <PublicOnlyRoute>
        <AuthLayout>{wrap(LoginPage)}</AuthLayout>
      </PublicOnlyRoute>
    ),
  },
  {
    path: ROUTES.UNAUTHORIZED,
    element: <UnauthorizedPage />,
  },

  // Dashboard
  {
    path: ROUTES.DASHBOARD,
    errorElement: <RouterErrorBoundary />,
    element: <AdminOnlyRoute><AdminLayout>{wrap(DashboardPage)}</AdminLayout></AdminOnlyRoute>,
  },

  // Catalog
  { path: ROUTES.PRODUCTS,         errorElement: <RouterErrorBoundary />, element: <AdminOnlyRoute><AdminLayout>{wrap(ProductsPage)}</AdminLayout></AdminOnlyRoute> },
  { path: '/catalog/products/:slug', errorElement: <RouterErrorBoundary />, element: <AdminOnlyRoute><AdminLayout>{wrap(ProductDetailPage)}</AdminLayout></AdminOnlyRoute> },
  { path: ROUTES.CATEGORIES,       errorElement: <RouterErrorBoundary />, element: <AdminOnlyRoute><AdminLayout>{wrap(CategoriesPage)}</AdminLayout></AdminOnlyRoute> },
  { path: ROUTES.BRANDS,           errorElement: <RouterErrorBoundary />, element: <AdminOnlyRoute><AdminLayout>{wrap(BrandsPage)}</AdminLayout></AdminOnlyRoute> },
  { path: ROUTES.INVENTORY,        errorElement: <RouterErrorBoundary />, element: <AdminOnlyRoute><AdminLayout>{wrap(InventoryPage)}</AdminLayout></AdminOnlyRoute> },
  { path: ROUTES.BANNERS,          errorElement: <RouterErrorBoundary />, element: <AdminOnlyRoute><AdminLayout>{wrap(BannersPage)}</AdminLayout></AdminOnlyRoute> },

  // Orders
  { path: ROUTES.ORDERS,           errorElement: <RouterErrorBoundary />, element: <AdminOnlyRoute><AdminLayout>{wrap(OrdersPage)}</AdminLayout></AdminOnlyRoute> },
  { path: '/orders/:orderNumber',  errorElement: <RouterErrorBoundary />, element: <AdminOnlyRoute><AdminLayout>{wrap(OrderDetailPage)}</AdminLayout></AdminOnlyRoute> },

  // Payments
  { path: ROUTES.PAYMENT_METHODS,    errorElement: <RouterErrorBoundary />, element: <AdminOnlyRoute><AdminLayout>{wrap(PaymentMethodsPage)}</AdminLayout></AdminOnlyRoute> },
  { path: ROUTES.PAYMENT_SUBMISSIONS, errorElement: <RouterErrorBoundary />, element: <AdminOnlyRoute><AdminLayout>{wrap(PaymentSubmissionsPage)}</AdminLayout></AdminOnlyRoute> },

  // Customers
  { path: ROUTES.CUSTOMERS,        errorElement: <RouterErrorBoundary />, element: <AdminOnlyRoute><AdminLayout>{wrap(CustomersPage)}</AdminLayout></AdminOnlyRoute> },
  { path: '/customers/:id',        errorElement: <RouterErrorBoundary />, element: <AdminOnlyRoute><AdminLayout>{wrap(CustomerDetailPage)}</AdminLayout></AdminOnlyRoute> },

  // Engagement
  { path: ROUTES.COUPONS,          errorElement: <RouterErrorBoundary />, element: <AdminOnlyRoute><AdminLayout>{wrap(CouponsPage)}</AdminLayout></AdminOnlyRoute> },
  { path: ROUTES.REVIEWS,          errorElement: <RouterErrorBoundary />, element: <AdminOnlyRoute><AdminLayout>{wrap(ReviewsPage)}</AdminLayout></AdminOnlyRoute> },
  { path: ROUTES.MARKETING,        errorElement: <RouterErrorBoundary />, element: <AdminOnlyRoute><AdminLayout>{wrap(MarketingPage)}</AdminLayout></AdminOnlyRoute> },
  { path: ROUTES.CONTACT,          errorElement: <RouterErrorBoundary />, element: <AdminOnlyRoute><AdminLayout>{wrap(ContactPage)}</AdminLayout></AdminOnlyRoute> },

  // Analytics, Settings & Exports
  { path: ROUTES.ANALYTICS,        errorElement: <RouterErrorBoundary />, element: <AdminOnlyRoute><AdminLayout>{wrap(AnalyticsPage)}</AdminLayout></AdminOnlyRoute> },
  { path: ROUTES.NOTIFICATIONS,    errorElement: <RouterErrorBoundary />, element: <AdminOnlyRoute><AdminLayout>{wrap(NotificationsPage)}</AdminLayout></AdminOnlyRoute> },
  { path: ROUTES.SETTINGS,         errorElement: <RouterErrorBoundary />, element: <AdminOnlyRoute><AdminLayout>{wrap(SettingsPage)}</AdminLayout></AdminOnlyRoute> },
  { path: ROUTES.EXPORTS,          errorElement: <RouterErrorBoundary />, element: <AdminOnlyRoute><AdminLayout>{wrap(ExportsPage)}</AdminLayout></AdminOnlyRoute> },

  // 404 catch-all
  { path: '*', element: <NotFoundPage /> },
])
