import { useState } from 'react'
import {
  BarChart3, Bell, Boxes, ClipboardList, LayoutDashboard, LogOut,
  Megaphone, Menu, Moon, PackageSearch, Settings2, ShoppingBag,
  Star, Sun, Tag, Users, X, ChevronDown, Search, Ticket,
} from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { cn } from '@/utils/cn'

// ─── Sidebar nav config ────────────────────────────────────────────────────
const NAV_SECTIONS = [
  {
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, to: '/' },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { label: 'Products',   icon: Boxes,         to: '/catalog/products' },
      { label: 'Categories', icon: Tag,            to: '/catalog/categories' },
      { label: 'Brands',     icon: Star,           to: '/catalog/brands' },
      { label: 'Inventory',  icon: PackageSearch,  to: '/catalog/inventory' },
    ],
  },
  {
    label: 'Commerce',
    items: [
      { label: 'Orders',    icon: ClipboardList, to: '/orders' },
      { label: 'Customers', icon: Users,         to: '/customers' },
      { label: 'Coupons',   icon: Ticket,        to: '/coupons' },
    ],
  },
  {
    label: 'Engagement',
    items: [
      { label: 'Reviews',       icon: Star,      to: '/reviews' },
      { label: 'Marketing',     icon: Megaphone, to: '/marketing' },
      { label: 'Notifications', icon: Bell,      to: '/notifications' },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Analytics', icon: BarChart3,  to: '/analytics' },
      { label: 'Settings',  icon: Settings2,  to: '/settings' },
    ],
  },
]

// ─── Avatar initials helper ────────────────────────────────────────────────
function UserAvatar({ name, size = 'sm' }: { name: string; size?: 'sm' | 'md' }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
  const dim = size === 'sm' ? 'h-8 w-8 text-[11px]' : 'h-9 w-9 text-xs'
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-semibold text-white',
        dim
      )}
      style={{ background: 'hsl(224 76% 48%)' }}
    >
      {initials || '?'}
    </div>
  )
}

// ─── Sidebar ───────────────────────────────────────────────────────────────
function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div
      className="flex h-full flex-col"
      style={{ background: '#1a2035', color: 'rgba(255,255,255,0.75)' }}
    >
      {/* Logo */}
      <div
        className="flex h-16 shrink-0 items-center gap-3 border-b px-5"
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ background: 'hsl(224 76% 48%)' }}
        >
          <ShoppingBag className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold leading-tight text-white">ShopCore</p>
          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Admin
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
        {NAV_SECTIONS.map((section, si) => (
          <div key={si} className={si > 0 ? 'mt-1' : ''}>
            {section.label && (
              <p
                className="px-3 pb-1 pt-4 text-[9px] font-bold uppercase tracking-widest"
                style={{ color: 'rgba(255,255,255,0.28)' }}
              >
                {section.label}
              </p>
            )}
            {section.items.map(({ label, icon: Icon, to }) => (
              <NavLink
                key={label}
                to={to}
                end={to === '/'}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
                    isActive
                      ? 'text-white'
                      : 'hover:bg-white/10 hover:text-white'
                  )
                }
                style={({ isActive }) =>
                  isActive ? { background: 'hsl(224 76% 48%)' } : {}
                }
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                {label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Bottom status */}
      <div
        className="shrink-0 border-t p-3"
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center gap-2.5 rounded-lg px-3 py-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10">
            <ShoppingBag className="h-3.5 w-3.5 text-white/60" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-white/80">ShopCore</p>
            <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
              v1.0.0
            </p>
          </div>
          <div className="ml-auto h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
        </div>
      </div>
    </div>
  )
}

// ─── Top nav ───────────────────────────────────────────────────────────────
function TopNav({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, logout } = useAuth()
  const { resolvedTheme, setTheme } = useTheme()
  const navigate = useNavigate()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const displayName = user?.full_name || user?.email || 'Admin'

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur-md sm:px-6">
      {/* Mobile menu toggle */}
      <button
        type="button"
        aria-label="Open navigation"
        onClick={onMenuClick}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-background-subtle hover:text-text-primary lg:hidden"
      >
        <Menu className="h-4.5 w-4.5" />
      </button>

      {/* Search bar */}
      <div className="flex max-w-xs flex-1 items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
        <Search className="h-3.5 w-3.5 shrink-0 text-text-muted" />
        <input
          className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-muted outline-none"
          placeholder="Search anything…"
          readOnly
        />
        <kbd className="rounded bg-background-subtle px-1.5 py-0.5 font-mono text-[10px] text-text-muted">
          Ctrl /
        </kbd>
      </div>

      <div className="flex-1" />

      {/* Right actions */}
      <div className="flex items-center gap-1">
        {/* Theme toggle */}
        <button
          type="button"
          aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-background-subtle hover:text-text-primary"
        >
          {resolvedTheme === 'dark' ? (
            <Sun className="h-4 w-4" aria-hidden />
          ) : (
            <Moon className="h-4 w-4" aria-hidden />
          )}
        </button>

        {/* Notifications */}
        <button
          type="button"
          aria-label="Notifications"
          onClick={() => navigate('/notifications')}
          className="relative flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-background-subtle hover:text-text-primary"
        >
          <Bell className="h-4 w-4" aria-hidden />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger" />
        </button>

        {/* Settings */}
        <button
          type="button"
          aria-label="Settings"
          onClick={() => navigate('/settings')}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-background-subtle hover:text-text-primary"
        >
          <Settings2 className="h-4 w-4" aria-hidden />
        </button>

        {/* User chip */}
        <div className="relative ml-1">
          <button
            type="button"
            onClick={() => setUserMenuOpen((o) => !o)}
            className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-background-subtle"
          >
            <UserAvatar name={displayName} size="sm" />
            <div className="hidden text-left sm:block">
              <p className="max-w-[10rem] truncate text-[13px] font-semibold text-text-primary">
                {displayName}
              </p>
              <p className="text-[10px] text-text-muted">Super Admin</p>
            </div>
            <ChevronDown className="hidden h-3.5 w-3.5 text-text-muted sm:block" aria-hidden />
          </button>

          {userMenuOpen && (
            <>
              <button
                type="button"
                aria-label="Close menu"
                className="fixed inset-0 z-10 cursor-default"
                onClick={() => setUserMenuOpen(false)}
              />
              <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-xl border border-border bg-surface shadow-md">
                <div className="border-b border-border px-4 py-3">
                  <p className="truncate text-[13px] font-semibold text-text-primary">
                    {displayName}
                  </p>
                  <p className="text-[11px] text-text-muted">{user?.email}</p>
                </div>
                <div className="p-1">
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-danger transition-colors hover:bg-danger-subtle"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

// ─── Root layout ───────────────────────────────────────────────────────────
export function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-background text-text-primary">
      {/* Mobile drawer backdrop */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-overlay/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 h-full w-[min(16rem,88vw)] shadow-lg">
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 z-10 flex h-7 w-7 items-center justify-center rounded-lg text-white/60 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 lg:block">
        <Sidebar />
      </aside>

      {/* Main content area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopNav onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
