import { Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { ToastProvider } from '@/components/feedback/ToastProvider'
import { CartDrawer } from '@/features/cart/components/CartDrawer'
import { useCartUI } from '@/contexts/CartUIContext'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useToast } from '@/contexts/ToastContext'

export function RootLayout() {
  const { isCartOpen, closeCart } = useCartUI()
  const isOnline = useOnlineStatus()
  const { toast } = useToast()
  const location = useLocation()

  // Move focus to main content on route change (screen-reader friendliness)
  useEffect(() => {
    const main = document.getElementById('main-content')
    if (main) {
      main.setAttribute('tabindex', '-1')
      main.focus({ preventScroll: true })
    }
  }, [location.pathname])

  // Offline banner
  useEffect(() => {
    if (!isOnline) {
      toast({
        title: 'You are offline',
        description: 'Check your connection — some features may be unavailable.',
        variant: 'warning',
        duration: 0, // persistent until back online
      })
    }
  }, [isOnline, toast])

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      {/* Skip to main content for keyboard/screen-reader users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-text-inverse focus:shadow-md"
      >
        Skip to main content
      </a>

      <Navbar />

      <main id="main-content" className="flex-1 outline-none">
        <Outlet />
      </main>

      <Footer />

      {/* Global overlays */}
      <CartDrawer open={isCartOpen} onClose={closeCart} />
      <ToastProvider />
    </div>
  )
}
