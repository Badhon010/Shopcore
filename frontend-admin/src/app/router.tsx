import { lazy, Suspense } from 'react'
import {
  createBrowserRouter,
  isRouteErrorResponse,
  Navigate,
  useRouteError,
} from 'react-router-dom'
import { AdminLayout } from '@/layouts/AdminLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { Spinner } from '@/components/feedback/Spinner'
import { ErrorState } from '@/components/feedback/ErrorState'
import { AdminOnlyRoute } from '@/routes/AdminOnlyRoute'
import { PublicOnlyRoute } from '@/routes/PublicOnlyRoute'

// Auth
const LoginPage = lazy(() => import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })))
const UnauthorizedPage = lazy(() => import('@/pages/UnauthorizedPage').then((m) => ({ default: m.UnauthorizedPage })))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })))

// Core
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })))

// Catalog
const ProductsPage = lazy(() => import('@/pages/catalog/ProductsPage').then((m) => ({ default: m.ProductsPage })))
const ProductDetailPage = lazy(() => import('@/pages/catalog/ProductDetailPage').then((m) => ({ default: m.ProductDetailPage })))
const CategoriesPage = lazy(() => import('@/pages/catalog/CategoriesPage').then((m) => ({ default: m.CategoriesPage })))
const BrandsPage = lazy(() => import('@/pages/catalog/BrandsPage').then((m) => ({ default: m.BrandsPage })))
const InventoryPage = lazy(() => import('@/pages/catalog/InventoryPage').then((m) => ({ default: m.InventoryPage })))

// Commerce
const OrdersPage = lazy(() => import('@/pages/orders/OrdersPage').then((m) => ({ default: m.OrdersPage })))
const OrderDetailPage = lazy(() => import('@/pages/orders/OrderDetailPage').then((m) => ({ default: m.OrderDetailPage })))
const CustomersPage = lazy(() => import('@/pages/customers/CustomersPage').then((m) => ({ default: m.CustomersPage })))
const CouponsPage = lazy(() => import('@/pages/coupons/CouponsPage').then((m) => ({ default: m.CouponsPage })))

// Engagement
const ReviewsPage = lazy(() => import('@/pages/reviews/ReviewsPage').then((m) => ({ default: m.ReviewsPage })))
const MarketingPage = lazy(() => import('@/pages/marketing/MarketingPage').then((m) => ({ default: m.MarketingPage })))
const NotificationsPage = lazy(() => import('@/pages/notifications/NotificationsPage').then((m) => ({ default: m.NotificationsPage })))

// System
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const AnalyticsPage = lazy(() => import('@/pages/analytics/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })))

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

function RouterErrorBoundary() {
  const error = useRouteError()
  if (isRouteErrorResponse(error) && error.status === 404) {
    return withSuspense(NotFoundPage)
  }
  console.error('[AdminRouterErrorBoundary]', error)
  return <ErrorState title="The admin workspace could not load" description="Please try again." />
}

export const router = createBrowserRouter([
  {
    element: (
      <PublicOnlyRoute>
        <AuthLayout />
      </PublicOnlyRoute>
    ),
    errorElement: <RouterErrorBoundary />,
    children: [{ path: '/login', element: withSuspense(LoginPage) }],
  },
  {
    element: (
      <AdminOnlyRoute>
        <AdminLayout />
      </AdminOnlyRoute>
    ),
    errorElement: <RouterErrorBoundary />,
    children: [
      { index: true, element: withSuspense(DashboardPage) },
      { path: '/', element: withSuspense(DashboardPage) },
      { path: '/unauthorized', element: withSuspense(UnauthorizedPage) },

      // Catalog
      { path: '/catalog/products', element: withSuspense(ProductsPage) },
      { path: '/catalog/products/:slug', element: withSuspense(ProductDetailPage) },
      { path: '/catalog/categories', element: withSuspense(CategoriesPage) },
      { path: '/catalog/brands', element: withSuspense(BrandsPage) },
      { path: '/catalog/inventory', element: withSuspense(InventoryPage) },

      // Commerce
      { path: '/orders', element: withSuspense(OrdersPage) },
      { path: '/orders/:orderNumber', element: withSuspense(OrderDetailPage) },
      { path: '/customers', element: withSuspense(CustomersPage) },
      { path: '/coupons', element: withSuspense(CouponsPage) },

      // Engagement
      { path: '/reviews', element: withSuspense(ReviewsPage) },
      { path: '/marketing', element: withSuspense(MarketingPage) },
      { path: '/notifications', element: withSuspense(NotificationsPage) },

      // System
      { path: '/analytics', element: withSuspense(AnalyticsPage) },
      { path: '/settings', element: withSuspense(SettingsPage) },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
