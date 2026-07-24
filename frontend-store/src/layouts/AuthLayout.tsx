import { Outlet, Link } from 'react-router-dom'
import { ShoppingBag, Leaf, ShieldCheck, Star } from 'lucide-react'
import { ROUTES } from '@/constants/routes'

const TRUST_SIGNALS = [
  { icon: Leaf,         text: 'Ethically sourced products' },
  { icon: ShieldCheck,  text: '100% secure checkout' },
  { icon: Star,         text: '98% customer satisfaction' },
]

export function AuthLayout() {
  return (
    <div className="flex min-h-screen bg-bg-subtle">

      {/* ── Brand panel (desktop only) ────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-5/12 xl:w-1/2 shrink-0 flex-col justify-between p-12"
        style={{ background: 'linear-gradient(150deg, hsl(var(--primary)) 0%, hsl(var(--primary-active)) 100%)' }}
      >
        <Link
          to={ROUTES.HOME}
          className="flex items-center gap-2 text-heading-sm font-bold focus-visible:outline-none focus-visible:shadow-focus-ring rounded"
          style={{ color: 'hsl(var(--primary-foreground))' }}
        >
          <ShoppingBag className="h-5 w-5" />
          ShopCore
        </Link>

        <div className="space-y-8">
          <div>
            <p
              className="text-display-lg font-bold leading-tight text-balance"
              style={{ color: 'hsl(var(--primary-foreground))' }}
            >
              Beautiful things, made with intention
            </p>
            <p className="mt-4 text-body-lg" style={{ color: 'hsl(var(--primary-foreground)/0.75)' }}>
              Join thousands of customers who trust ShopCore for premium, sustainably sourced goods.
            </p>
          </div>

          <div className="space-y-3">
            {TRUST_SIGNALS.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: 'hsl(var(--primary-foreground)/0.15)' }}
                >
                  <Icon className="h-4 w-4" style={{ color: 'hsl(var(--primary-foreground))' }} />
                </span>
                <span className="text-body-sm font-medium" style={{ color: 'hsl(var(--primary-foreground)/0.9)' }}>
                  {text}
                </span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-caption" style={{ color: 'hsl(var(--primary-foreground)/0.45)' }}>
          © {new Date().getFullYear()} ShopCore. All rights reserved.
        </p>
      </div>

      {/* ── Form panel ────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Mobile-only logo */}
          <div className="mb-8 text-center lg:hidden">
            <Link
              to={ROUTES.HOME}
              className="inline-flex items-center gap-2 text-heading-md font-semibold text-text-primary transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:shadow-focus-ring rounded"
            >
              <ShoppingBag className="h-5 w-5" />
              ShopCore
            </Link>
          </div>

          <div className="rounded-xl border border-border bg-surface p-8 shadow-sm">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  )
}
