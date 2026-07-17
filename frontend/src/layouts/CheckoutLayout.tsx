import { Outlet, Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { ToastProvider } from '@/components/feedback/ToastProvider'

export function CheckoutLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="border-b border-border bg-bg">
        <div className="container-page flex h-14 items-center justify-between">
          <Link
            to={ROUTES.HOME}
            className="text-heading-sm font-semibold text-text-primary focus-visible:outline-none focus-visible:shadow-focus-ring rounded"
          >
            ShopCore
          </Link>
          <span className="text-body-sm text-text-secondary">Secure Checkout</span>
        </div>
      </header>

      <main id="main-content" className="flex-1 outline-none">
        <Outlet />
      </main>

      <ToastProvider />
    </div>
  )
}
