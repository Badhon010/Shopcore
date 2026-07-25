import { Outlet } from 'react-router-dom'
import { ShieldCheck, ShoppingBag, Sparkles } from 'lucide-react'

const TRUST_SIGNALS = [
  { icon: ShieldCheck, text: 'Staff-only access backed by Django permissions' },
  { icon: Sparkles, text: 'A focused workspace for running ShopCore' },
]

export function AuthLayout() {
  return (
    <div className="flex min-h-screen bg-bg-subtle">
      <aside className="hidden w-5/12 shrink-0 flex-col justify-between bg-primary p-12 lg:flex xl:w-1/2">
        <div className="flex items-center gap-2 text-heading-sm font-bold text-primary-foreground">
          <ShoppingBag className="h-5 w-5" aria-hidden />
          ShopCore <span className="font-normal opacity-70">Admin</span>
        </div>

        <div className="space-y-8">
          <div>
            <p className="max-w-lg text-display-lg font-bold leading-tight text-primary-foreground">
              Run your store with clarity.
            </p>
            <p className="mt-4 max-w-md text-body-lg text-primary-foreground/75">
              The ShopCore administration workspace is built for the teams behind every order.
            </p>
          </div>
          <div className="space-y-3">
            {TRUST_SIGNALS.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/15">
                  <Icon className="h-4 w-4 text-primary-foreground" aria-hidden />
                </span>
                <span className="text-body-sm font-medium text-primary-foreground/90">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-caption text-primary-foreground/45">
          © {new Date().getFullYear()} ShopCore. Internal workspace.
        </p>
      </aside>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center lg:hidden">
            <div className="inline-flex items-center gap-2 text-heading-md font-semibold text-text-primary">
              <ShoppingBag className="h-5 w-5" aria-hidden />
              ShopCore <span className="font-normal text-text-secondary">Admin</span>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-surface p-8 shadow-sm">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}