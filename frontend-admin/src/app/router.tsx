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

const LoginPage = lazy(() => import('@/pages/LoginPage').then((module) => ({ default: module.LoginPage })))
const WorkspacePage = lazy(() =>
  import('@/pages/WorkspacePage').then((module) => ({ default: module.WorkspacePage }))
)
const UnauthorizedPage = lazy(() =>
  import('@/pages/UnauthorizedPage').then((module) => ({ default: module.UnauthorizedPage }))
)
const NotFoundPage = lazy(() =>
  import('@/pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage }))
)

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
      { path: '/', element: withSuspense(WorkspacePage) },
      { path: '/unauthorized', element: withSuspense(UnauthorizedPage) },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])