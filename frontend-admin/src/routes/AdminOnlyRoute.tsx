import { Navigate, useLocation, type ReactNode } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Spinner } from '@/components/feedback/Spinner'
import { ROUTES } from '@/constants/routes'

interface AdminOnlyRouteProps {
  children: ReactNode
}

export function AdminOnlyRoute({ children }: AdminOnlyRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" className="text-primary" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />
  }

  if (!user?.is_staff) {
    return <Navigate to={ROUTES.UNAUTHORIZED} replace />
  }

  return <>{children}</>
}
