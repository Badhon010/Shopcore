import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, ChevronLeft, ChevronRight, Sun, Moon, Monitor, Search, LogOut } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Avatar } from '@/components/ui/Avatar'
import { IconButton } from '@/components/ui/IconButton'
import { Tooltip, TooltipProvider } from '@/components/ui/Tooltip'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { GlobalSearch } from '@/components/ui/GlobalSearch'
import { NotificationBell } from '@/components/layout/NotificationBell'
import { UserMenu } from '@/components/layout/UserMenu'
import { QuickActions } from '@/components/layout/QuickActions'
import { PageContainer } from '@/components/layout/PageContainer'
import { NAV_GROUPS } from '@/constants/navigation'
import { ROUTES } from '@/constants/routes'
import { getBreadcrumbs } from '@/utils/breadcrumbs'
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
  const crumbs = getBreadcrumbs(location.pathname)

  // Close mobile drawer on route change
  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  // Escape closes the mobile drawer
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // Cmd/Ctrl + K opens global search; Cmd/Ctrl + / as fallback
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key.toLowerCase() === 'k' || e.key === '/')) {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // Lock body scroll while the mobile drawer is open
  useEffect(() => {
    if (!mobileOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [mobileOpen])

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      try { localStorage.setItem(COLLAPSED_KEY, String(next)) } catch { /* ignore */ }
      return next
    })
  }, [])

  const closeSearch = useCallback(() => setSearchOpen(false), [])

  const handleLogout = useCallback(() => {
    logout()
    navigate(ROUTES.LOGIN)
  }, [logout, navigate])

  const nextTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-screen bg-background">
        {/* ── Mobile backdrop ─────────────────────────────── */}
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

        {/* ── Sidebar ─────────────────────────────────────── */}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-surface transition-[width,transform] duration-300',
            'lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
            collapsed ? 'lg:w-16' : 'lg:w-60',
            mobileOpen ? 'w-72 translate-x-0' : 'w-72 -translate-x-full lg:translate-x-0'
          )}
          aria-label="Main navigation"
        >
          {/* Logo / Brand — text fades instead of unmounting so collapse is smooth */}
          <div className="flex h-[60px] shrink-0 items-center justify-between border-b border-border px-4">
            <Link to={ROUTES.DASHBOARD} className="flex min-w-0 items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:shadow-focus-ring" aria-label="ShopCore dashboard">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary">
                <span className="text-xs font-bold text-primary-foreground">S</span>
              </div>
              <span
                aria-hidden={collapsed}
                className={cn(
                  'truncate text-sm font-semibold text-text-primary transition-[max-width,opacity] duration-300',
                  collapsed ? 'max-w-0 opacity-0' : 'max-w-[8rem] opacity-100'
                )}
              >
                ShopCore
              </span>
            </Link>
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
          <nav className="flex-1 overflow-y-auto px-2 py-4">
            <div className="space-y-5">
              {NAV_GROUPS.map((group) => (
                <div key={group.label}>
                  <p
                    aria-hidden={collapsed}
                    className={cn(
                      'overflow-hidden px-3 text-[10px] font-semibold uppercase tracking-widest text-text-muted transition-[max-height,opacity] duration-300',
                      collapsed ? 'mb-0 max-h-0 opacity-0' : 'mb-1 max-h-5 opacity-100'
                    )}
                  >
                    {group.label}
                  </p>
                  <ul className="space-y-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon
                      const navLink = (
                        <NavLink
                          to={item.href}
                          end={item.href === '/'}
                          className={({ isActive }) =>
                            cn(
                              'relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                              'focus-visible:outline-none focus-visible:shadow-focus-ring',
                              isActive
                                ? 'bg-primary-light text-primary'
                                : 'text-text-secondary hover:bg-bg-subtle hover:text-text-primary',
                              collapsed && 'justify-center gap-0 px-0'
                            )
                          }
                        >
                          {({ isActive }) => (
                            <>
                              {/* Active indicator — hidden when collapsed to avoid a stray bar at the rail edge */}
                              <span
                                aria-hidden
                                className={cn(
                                  'absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary transition-opacity',
                                  isActive ? 'opacity-100' : 'opacity-0',
                                  collapsed && 'hidden'
                                )}
                              />
                              <Icon className={cn('h-4 w-4 shrink-0', isActive && 'text-primary')} aria-hidden />
                              <span
                                aria-hidden={collapsed}
                                className={cn(
                                  'truncate transition-[max-width,opacity] duration-300',
                                  collapsed ? 'max-w-0 opacity-0' : 'max-w-[11rem] opacity-100'
                                )}
                              >
                                {item.label}
                              </span>
                            </>
                          )}
                        </NavLink>
                      )
                      return (
                        <li key={item.href}>
                          {collapsed ? (
                            <Tooltip content={item.label} side="right">
                              {navLink}
                            </Tooltip>
                          ) : navLink}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </nav>

          {/* Footer: user + theme */}
          <div className="shrink-0 border-t border-border p-2">
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
            {/* Mobile menu button + breadcrumbs */}
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <IconButton
                icon={<Menu className="h-5 w-5" />}
                label="Open menu"
                onClick={() => setMobileOpen(true)}
                className="lg:hidden"
              />
              <div className="hidden min-w-0 lg:block">
                <Breadcrumbs items={crumbs} />
              </div>
              {/* Mobile: current page title */}
              <p className="truncate text-sm font-semibold text-text-primary lg:hidden">
                {crumbs[crumbs.length - 1]?.label ?? 'ShopCore'}
              </p>
            </div>

            {/* Right actions */}
            <div className="flex shrink-0 items-center gap-1.5">
              {/* Search */}
              <button
                onClick={() => setSearchOpen(true)}
                className="flex h-9 items-center gap-2 rounded-lg border border-border bg-bg-subtle px-3 text-sm text-text-muted transition-colors hover:bg-secondary hover:text-text-primary focus-visible:outline-none focus-visible:shadow-focus-ring"
                aria-label="Open search (Ctrl+K)"
              >
                <Search className="h-3.5 w-3.5" aria-hidden />
                <span className="hidden text-xs sm:block">Search</span>
                <kbd className="hidden rounded border border-border bg-surface px-1 font-mono text-[10px] sm:block" aria-hidden>
                  Ctrl K
                </kbd>
              </button>

              {/* Quick actions */}
              <div className="hidden md:block">
                <QuickActions />
              </div>

              {/* Theme */}
              <IconButton
                icon={<ThemeIcon className="h-4 w-4" />}
                label={`Theme: ${theme}. Click to switch.`}
                onClick={() => setTheme(nextTheme)}
              />

              {/* Notifications */}
              <NotificationBell />

              {/* User menu */}
              <UserMenu />
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1">
            <PageContainer>{children}</PageContainer>
          </main>
        </div>

        {/* Global search / command palette overlay */}
        <GlobalSearch open={searchOpen} onClose={closeSearch} />
      </div>
    </TooltipProvider>
  )
}
