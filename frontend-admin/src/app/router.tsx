import { createBrowserRouter, Navigate, useRouteError, isRouteErrorResponse } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AdminLayout } from '@/layouts/AdminLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { AdminOnlyRoute } from '@/routes/AdminOnlyRoute'
import { PublicOnlyRoute } from '@/routes/PublicOnlyRoute'
import { Spinner } from '@/components/feedback/Spinner'
import { ROUTES } from '@/constants/routes'
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
const CustomersPage     = lazy(() => import('@/pages/customers/CustomersPage').then((m) => ({ default: m.CustomersPage })))
const CustomerDetailPage= lazy(() => import('@/pages/customers/CustomerDetailPage').then((m) => ({ default: m.CustomerDetailPage })))
const CouponsPage       = lazy(() => import('@/pages/coupons/CouponsPage').then((m) => ({ default: m.CouponsPage })))
const ReviewsPage       = lazy(() => import('@/pages/reviews/ReviewsPage').then((m) => ({ default: m.ReviewsPage })))
const MarketingPage     = lazy(() => import('@/pages/marketing/MarketingPage').then((m) => ({ default: m.MarketingPage })))
const ContactPage       = lazy(() => import('@/pages/ContactPage').then((m) => ({ default: m.ContactPage })))
const AnalyticsPage     = lazy(() => import('@/pages/analytics/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })))
const NotificationsPage = lazy(() => import('@/pages/notifications/NotificationsPage').then((m) => ({ default: m.NotificationsPage })))
const SettingsPage      = lazy(() => import('@/pages/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })))

function PageFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Spinner size="lg" className="text-primary" />
    </div>
  )
}

function wrap(Component: React.ComponentType) {
  return (
    <Suspense fallback={<PageFallback />}>
      <Component />
    </Suspense>
  )
}

function NotFoundPage() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <p className="text-5xl font-bold text-text-muted">404</p>
      <h1 className="mt-3 text-lg font-semibold text-text-primary">Page not found</h1>
      <p className="mt-1 text-sm text-text-secondary">The page you're looking for doesn't exist.</p>
      <a href={ROUTES.DASHBOARD} className="mt-6 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover">
        Back to dashboard
      </a>
    </div>
  )
}


function RouterErrorBoundary() {
  const error = useRouteError()
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <h1 className="text-lg font-semibold text-text-primary">Something went wrong</h1>
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

  // Customers
  { path: ROUTES.CUSTOMERS,        errorElement: <RouterErrorBoundary />, element: <AdminOnlyRoute><AdminLayout>{wrap(CustomersPage)}</AdminLayout></AdminOnlyRoute> },
  { path: '/customers/:id',        errorElement: <RouterErrorBoundary />, element: <AdminOnlyRoute><AdminLayout>{wrap(CustomerDetailPage)}</AdminLayout></AdminOnlyRoute> },

  // Engagement
  { path: ROUTES.COUPONS,          errorElement: <RouterErrorBoundary />, element: <AdminOnlyRoute><AdminLayout>{wrap(CouponsPage)}</AdminLayout></AdminOnlyRoute> },
  { path: ROUTES.REVIEWS,          errorElement: <RouterErrorBoundary />, element: <AdminOnlyRoute><AdminLayout>{wrap(ReviewsPage)}</AdminLayout></AdminOnlyRoute> },
  { path: ROUTES.MARKETING,        errorElement: <RouterErrorBoundary />, element: <AdminOnlyRoute><AdminLayout>{wrap(MarketingPage)}</AdminLayout></AdminOnlyRoute> },
  { path: ROUTES.CONTACT,          errorElement: <RouterErrorBoundary />, element: <AdminOnlyRoute><AdminLayout>{wrap(ContactPage)}</AdminLayout></AdminOnlyRoute> },

  // Analytics & Settings
  { path: ROUTES.ANALYTICS,        errorElement: <RouterErrorBoundary />, element: <AdminOnlyRoute><AdminLayout>{wrap(AnalyticsPage)}</AdminLayout></AdminOnlyRoute> },
  { path: ROUTES.NOTIFICATIONS,    errorElement: <RouterErrorBoundary />, element: <AdminOnlyRoute><AdminLayout>{wrap(NotificationsPage)}</AdminLayout></AdminOnlyRoute> },
  { path: ROUTES.SETTINGS,         errorElement: <RouterErrorBoundary />, element: <AdminOnlyRoute><AdminLayout>{wrap(SettingsPage)}</AdminLayout></AdminOnlyRoute> },

  // 404 catch-all
  { path: '*', element: <NotFoundPage /> },
])
