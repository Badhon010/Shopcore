import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import {
  Menu, X, ChevronLeft, ChevronRight, Sun, Moon, Monitor,
  Search, Bell, LogOut, User, Settings,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Avatar } from '@/components/ui/Avatar'
import { IconButton } from '@/components/ui/IconButton'
import { GlobalSearch } from '@/components/ui/GlobalSearch'
import { NAV_GROUPS } from '@/constants/navigation'
import { ROUTES } from '@/constants/routes'
import { cn } from '@/utils/cn'

const COLLAPSED_KEY = 'shopcore-admin-sidebar-collapsed'

interface AdminLayoutProps {
  children: ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSED_KEY) === 'true' } catch { return false }
  })
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  // Close mobile drawer on route change
  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  // Escape closes mobile drawer
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // Cmd+/ opens global search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      try { localStorage.setItem(COLLAPSED_KEY, String(next)) } catch { /* ignore */ }
      return next
    })
  }, [])

  const handleLogout = useCallback(() => {
    logout()
    navigate(ROUTES.LOGIN)
  }, [logout, navigate])

  const nextTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor

  return (
    <div className="flex min-h-screen bg-background">
      {/* ── Mobile backdrop ──────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-overlay/50 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
        )}
      </AnimatePresence>

      {/* ── Sidebar ──────────────────────────────────────── */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col bg-surface border-r border-border transition-all duration-300',
          // Desktop
          'lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen',
          collapsed ? 'lg:w-16' : 'lg:w-60',
          // Mobile
          mobileOpen ? 'translate-x-0 w-72' : '-translate-x-full w-72 lg:translate-x-0'
        )}
      >
        {/* Logo / Brand */}
        <div className={cn(
          'flex h-[60px] items-center border-b border-border px-4',
          collapsed ? 'justify-center' : 'justify-between'
        )}>
          {!collapsed && (
            <Link to={ROUTES.DASHBOARD} className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
                <span className="text-xs font-bold text-primary-foreground">S</span>
              </div>
              <span className="text-sm font-semibold text-text-primary">ShopCore</span>
            </Link>
          )}
          {/* Desktop collapse toggle */}
          <IconButton
            icon={collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={toggleCollapsed}
            className="hidden lg:inline-flex"
          />
          {/* Mobile close */}
          <IconButton
            icon={<X className="h-4 w-4" />}
            label="Close menu"
            onClick={() => setMobileOpen(false)}
            className="lg:hidden"
          />
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-6">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                  {group.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon
                  return (
                    <li key={item.href}>
                      <NavLink
                        to={item.href}
                        end={item.href === '/'}
                        title={collapsed ? item.label : undefined}
                        className={({ isActive }) =>
                          cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                            'focus-visible:outline-none focus-visible:shadow-focus-ring',
                            isActive
                              ? 'bg-primary-light text-primary'
                              : 'text-text-secondary hover:bg-bg-subtle hover:text-text-primary',
                            collapsed && 'justify-center px-0'
                          )
                        }
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.label}</span>}
                      </NavLink>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer: user + theme */}
        <div className="border-t border-border p-2">
          {!collapsed ? (
            <div className="flex items-center gap-2 rounded-lg p-2 hover:bg-bg-subtle">
              <Avatar name={user?.full_name || user?.email} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-text-primary">{user?.full_name || 'Admin'}</p>
                <p className="truncate text-[11px] text-text-muted">{user?.email}</p>
              </div>
              <IconButton
                icon={<LogOut className="h-3.5 w-3.5" />}
                label="Log out"
                size="sm"
                onClick={handleLogout}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <Avatar name={user?.full_name || user?.email} size="sm" />
              <IconButton
                icon={<LogOut className="h-3.5 w-3.5" />}
                label="Log out"
                size="sm"
                onClick={handleLogout}
              />
            </div>
          )}
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-[60px] items-center justify-between gap-4 border-b border-border bg-surface/90 px-4 backdrop-blur-sm sm:px-6">
          {/* Mobile menu button */}
          <IconButton
            icon={<Menu className="h-5 w-5" />}
            label="Open menu"
            onClick={() => setMobileOpen(true)}
            className="lg:hidden"
          />

          {/* Spacer / left area */}
          <div className="flex-1" />

          {/* Right actions */}
          <div className="flex items-center gap-1.5">
            {/* Search */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex h-9 items-center gap-2 rounded-lg border border-border bg-bg-subtle px-3 text-sm text-text-muted transition-colors hover:bg-secondary hover:text-text-primary focus-visible:outline-none focus-visible:shadow-focus-ring"
              aria-label="Open search (Ctrl+/)"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden text-xs sm:block">Search</span>
              <kbd className="hidden rounded border border-border px-1 font-mono text-[10px] sm:block">⌘/</kbd>
            </button>

            {/* Theme */}
            <IconButton
              icon={<ThemeIcon className="h-4 w-4" />}
              label={`Current theme: ${theme}. Click to switch.`}
              onClick={() => setTheme(nextTheme)}
            />

            {/* Notifications */}
            <NavLink
              to={ROUTES.NOTIFICATIONS}
              aria-label="Notifications"
              className="relative flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-bg-subtle hover:text-text-primary focus-visible:outline-none focus-visible:shadow-focus-ring"
            >
              <Bell className="h-4 w-4" />
            </NavLink>

            {/* User menu (settings shortcut) */}
            <NavLink
              to={ROUTES.SETTINGS}
              aria-label="Settings"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-bg-subtle hover:text-text-primary focus-visible:outline-none focus-visible:shadow-focus-ring"
            >
              <Avatar name={user?.full_name || user?.email} size="sm" />
            </NavLink>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6">
          {children}
        </main>
      </div>

      {/* Global search overlay */}
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}
