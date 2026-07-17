import { Outlet, Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'

export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-subtle px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link
            to={ROUTES.HOME}
            className="text-heading-md font-semibold text-text-primary transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:shadow-focus-ring rounded"
          >
            ShopCore
          </Link>
        </div>
        <div className="rounded-xl border border-border bg-surface p-8 shadow-sm">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
