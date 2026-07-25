import { useState } from 'react'
import { Menu, Moon, PanelLeftClose, PanelLeftOpen, Sun, X } from 'lucide-react'
import { Outlet, NavLink } from 'react-router-dom'
import { navigationSections } from '@/constants/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { cn } from '@/utils/cn'

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-20 items-center gap-2 border-b border-border px-6">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <span className="text-body-md font-bold">S</span>
        </span>
        <div>
          <p className="font-semibold leading-none text-text-primary">ShopCore</p>
          <p className="mt-1 text-caption text-text-muted">Admin workspace</p>
        </div>
      </div>

      <nav aria-label="Admin navigation" className="flex-1 space-y-7 overflow-y-auto p-4">
        {navigationSections.map((section) => (
          <div key={section.label}>
            <p className="mb-2 px-3 text-overline font-semibold uppercase text-text-muted">{section.label}</p>
            <div className="space-y-1">
              {section.items.map(({ label, icon: Icon, available, to }) =>
                available && to ? (
                  <NavLink
                    key={label}
                    to={to}
                    end
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-md px-3 py-2.5 text-body-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary-light text-primary'
                          : 'text-text-secondary hover:bg-bg-subtle hover:text-text-primary'
                      )
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    {label}
                  </NavLink>
                ) : (
                  <div
                    key={label}
                    className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2.5 text-body-sm font-medium text-text-muted opacity-70"
                    aria-disabled="true"
                    title="Available in a later milestone"
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="flex-1">{label}</span>
                    <span className="text-[10px] uppercase tracking-wide">Soon</span>
                  </div>
                )
              )}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-4">
        <p className="px-3 text-caption leading-relaxed text-text-muted">
          Business modules will be enabled as their real API contracts are ready.
        </p>
      </div>
    </div>
  )
}

export function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { user, logout } = useAuth()
  const { resolvedTheme, setTheme } = useTheme()

  const handleLogout = async () => {
    await logout()
  }

  return (
    <div className="min-h-screen bg-background text-text-primary">
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-overlay/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 h-full w-[min(20rem,88vw)] bg-surface shadow-lg">
            <IconButton
              label="Close navigation"
              size="sm"
              className="absolute right-3 top-5 z-10"
              onClick={() => setMobileOpen(false)}
            >
              <X className="h-4 w-4" aria-hidden />
            </IconButton>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 hidden border-r border-border bg-surface transition-[width] duration-200 lg:block',
          sidebarCollapsed ? 'w-[76px]' : 'w-64'
        )}
      >
        {sidebarCollapsed ? (
          <div className="flex h-full flex-col items-center border-r border-border py-5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <span className="font-bold">S</span>
            </span>
            <IconButton
              label="Expand navigation"
              size="sm"
              className="mt-8"
              onClick={() => setSidebarCollapsed(false)}
            >
              <PanelLeftOpen className="h-4 w-4" aria-hidden />
            </IconButton>
          </div>
        ) : (
          <>
            <SidebarContent />
            <IconButton
              label="Collapse navigation"
              size="sm"
              className="absolute bottom-5 right-4"
              onClick={() => setSidebarCollapsed(true)}
            >
              <PanelLeftClose className="h-4 w-4" aria-hidden />
            </IconButton>
          </>
        )}
      </aside>

      <div className={cn('min-h-screen transition-[padding] duration-200', sidebarCollapsed ? 'lg:pl-[76px]' : 'lg:pl-64')}>
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-border bg-surface/95 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <IconButton
              label="Open navigation"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" aria-hidden />
            </IconButton>
            <div>
              <p className="text-caption font-semibold uppercase tracking-[0.12em] text-text-muted">ShopCore</p>
              <h1 className="text-body-md font-semibold text-text-primary">Administration</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <IconButton
              label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="h-4 w-4" aria-hidden />
              ) : (
                <Moon className="h-4 w-4" aria-hidden />
              )}
            </IconButton>
            <div className="hidden text-right sm:block">
              <p className="max-w-[14rem] truncate text-body-sm font-medium text-text-primary">
                {user?.full_name || user?.email}
              </p>
              <p className="text-caption text-text-muted">Staff account</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => void handleLogout()}>
              Sign out
            </Button>
          </div>
        </header>

        <main className="container-page py-8 lg:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  )
}