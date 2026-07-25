import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/contexts/AuthContext'
import { Spinner } from '@/components/feedback/Spinner'

export function AdminOnlyRoute({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
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