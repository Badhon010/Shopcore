import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  ShoppingBag,
  Search,
  User,
  Heart,
  Menu,
  Moon,
  Sun,
  Monitor,
  X,
  Truck,
  Sparkles,
  ChevronDown,
  Grid3x3,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useAuth } from '@/contexts/AuthContext'
import { useCartUI } from '@/contexts/CartUIContext'
import { useTheme } from '@/contexts/ThemeContext'
import { ROUTES, buildRoute } from '@/constants/routes'
import { IconButton } from '@/components/ui/IconButton'
import { Avatar } from '@/components/ui/Avatar'
import { useCart } from '@/features/cart/hooks/useCart'
import { useWishlist } from '@/features/wishlist/hooks/useWishlist'
import { useCategoryTree } from '@/features/catalog/hooks/useProducts'
import { env } from '@/config/env'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'

// Only links to pages that actually exist in the app.
const PRIMARY_NAV = [
  { label: 'Home', to: ROUTES.HOME },
  { label: 'Shop', to: ROUTES.PRODUCTS },
  { label: 'Track Order', to: ROUTES.TRACK_ORDER },
  { label: 'About', to: ROUTES.ABOUT },
  { label: 'Contact', to: ROUTES.CONTACT },
  { label: 'FAQ', to: ROUTES.FAQ },
]

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const { user, isAuthenticated, logout } = useAuth()
  const { openCart } = useCartUI()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const { data: cart } = useCart()
  const { data: wishlist } = useWishlist()
  const { data: categoryTree, isLoading: isCategoryTreeLoading } = useCategoryTree()

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location.pathname])

  const cartItemCount = cart?.item_count ?? 0
  const wishlistCount = wishlist?.length ?? 0

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault()
    navigate(searchValue.trim() ? `${ROUTES.SEARCH}?q=${encodeURIComponent(searchValue.trim())}` : ROUTES.SEARCH)
  }

  return (
    <>
      {/* Utility bar */}
      <div className="hidden bg-primary text-primary-foreground sm:block">
        <div className="container-page flex h-9 items-center justify-between text-caption">
          <div className="flex items-center gap-1.5">
            <Truck className="h-3.5 w-3.5" aria-hidden />
            <span>Free shipping on orders over $100</span>
          </div>
          <div className="flex items-center gap-1.5" style={{ color: 'hsl(var(--accent))' }}>
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            <span>Premium quality products</span>
          </div>
          <div className="flex items-center gap-4 text-text-inverse/70">
            <Link to={ROUTES.FAQ} className="hover:text-text-inverse transition-colors">Help &amp; Support</Link>
            <Link to={ROUTES.TRACK_ORDER} className="hover:text-text-inverse transition-colors">Track Order</Link>
          </div>
        </div>
      </div>

      <header role="banner" className="sticky top-0 z-40 w-full border-b border-border bg-bg shadow-sm">
        {/* Main row */}
        <div className="container-page flex h-16 items-center gap-4 md:gap-6">
          {/* Logo */}
          <Link
            to={ROUTES.HOME}
            className="flex shrink-0 items-center gap-2 text-heading-sm font-bold tracking-tight text-text-primary transition-opacity hover:opacity-75 focus-visible:outline-none focus-visible:shadow-focus-ring rounded"
            aria-label={`${env.VITE_APP_NAME} - Home`}
          >
            <ShoppingBag className="h-5 w-5" aria-hidden />
            {env.VITE_APP_NAME.replace(/ Store$/i, '')}
          </Link>

          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="hidden flex-1 md:block md:max-w-[480px]">
            <div className="relative flex h-10 rounded-sm border border-border bg-bg-subtle transition-colors focus-within:border-primary focus-within:bg-bg focus-within:shadow-focus-ring">
              <input
                type="search"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Search for products, categories, brands…"
                aria-label="Search products"
                className="h-full w-full appearance-none rounded-l-sm bg-transparent px-3.5 text-body-sm text-text-primary placeholder:text-text-tertiary outline-none [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
              />
              <button
                type="submit"
                aria-label="Search"
                className="flex h-full w-10 shrink-0 items-center justify-center rounded-r-sm bg-primary text-primary-foreground transition-colors hover:bg-primary-hover outline-none"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </form>

          {/* Actions */}
          <div className="ml-auto flex items-center gap-0.5">
            <IconButton
              label="Search"
              onClick={() => navigate(ROUTES.SEARCH)}
              className="text-text-secondary hover:text-text-primary md:hidden"
            >
              <Search className="h-5 w-5" />
            </IconButton>

            {env.VITE_ENABLE_WISHLIST && (
              <div className="relative hidden sm:block">
                <IconButton
                  label={`Wishlist${wishlistCount > 0 ? `, ${wishlistCount} items` : ''}`}
                  className="w-10 text-text-secondary hover:text-text-primary lg:w-auto lg:gap-1.5 lg:px-3"
                  onClick={() =>
                    isAuthenticated ? navigate(ROUTES.ACCOUNT_WISHLIST) : navigate(ROUTES.LOGIN)
                  }
                >
                  <Heart className="h-5 w-5" />
                  <span className="hidden text-body-sm font-medium lg:inline">Wishlist</span>
                </IconButton>
                {wishlistCount > 0 && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground"
                  >
                    {wishlistCount > 9 ? '9+' : wishlistCount}
                  </span>
                )}
              </div>
            )}

            {/* Cart */}
            <div className="relative">
              <IconButton
                label={`Cart${cartItemCount > 0 ? `, ${cartItemCount} items` : ''}`}
                onClick={openCart}
                className="w-10 text-text-secondary hover:text-text-primary lg:w-auto lg:gap-1.5 lg:px-3"
              >
                <ShoppingBag className="h-5 w-5" />
                <span className="hidden text-body-sm font-medium lg:inline">Cart</span>
              </IconButton>
              {cartItemCount > 0 && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground"
                >
                  {cartItemCount > 9 ? '9+' : cartItemCount}
                </span>
              )}
            </div>

            {/* Theme toggle */}
            <ThemeToggle theme={theme} setTheme={setTheme} />

            {/* Account */}
            {isAuthenticated ? (
              <AccountMenu user={user} onLogout={logout} />
            ) : (
              <IconButton
                label="Sign in"
                onClick={() => navigate(ROUTES.LOGIN)}
                className="hidden text-text-secondary hover:text-text-primary sm:flex"
              >
                <User className="h-5 w-5" />
              </IconButton>
            )}

            {/* Mobile menu toggle */}
            <IconButton
              label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              className="md:hidden text-text-secondary hover:text-text-primary"
              onClick={() => setIsMobileMenuOpen((v) => !v)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </IconButton>
          </div>
        </div>

        {/* Category & nav row */}
        <div className="hidden border-t border-border md:block">
          <div className="container-page flex h-11 items-center gap-2">
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-body-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:shadow-focus-ring"
                >
                  <Menu className="h-3.5 w-3.5" aria-hidden />
                  All Categories
                  <ChevronDown className="h-3 w-3" aria-hidden />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="start"
                  sideOffset={8}
                  className="z-50 min-w-[220px] rounded-xl border border-border bg-surface p-1.5 shadow-lg data-[state=open]:animate-fade-in"
                >
                  {isCategoryTreeLoading ? (
                    <div className="space-y-1 p-1.5" aria-hidden>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-8 animate-pulse rounded-lg bg-bg-subtle" />
                      ))}
                    </div>
                  ) : (categoryTree ?? []).length > 0 ? (
                    (categoryTree ?? []).map((cat) => (
                      <DropdownMenu.Item
                        key={cat.id}
                        onSelect={() => navigate(buildRoute.category(cat.slug))}
                        className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-body-sm text-text-secondary outline-none transition-colors hover:bg-bg-subtle hover:text-text-primary focus:bg-bg-subtle"
                      >
                        <Grid3x3 className="h-3.5 w-3.5" aria-hidden />
                        {cat.name}
                      </DropdownMenu.Item>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-body-sm text-text-tertiary">No categories yet</div>
                  )}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>

            <nav className="flex items-center gap-0.5" aria-label="Main navigation">
              {PRIMARY_NAV.map((item) => (
                <NavLink key={item.label} to={item.to} currentPath={location.pathname}>
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Mobile nav */}
      {isMobileMenuOpen && (
        <MobileNav
          isAuthenticated={isAuthenticated}
          currentPath={location.pathname}
          categoryTree={categoryTree}
          isCategoryTreeLoading={isCategoryTreeLoading}
          onClose={() => setIsMobileMenuOpen(false)}
          onLogout={logout}
        />
      )}
    </>
  )
}

function NavLink({
  to,
  children,
  currentPath,
}: {
  to: string
  children: React.ReactNode
  currentPath: string
}) {
  const isActive = currentPath === to || currentPath.startsWith(to + '/')
  return (
    <Link
      to={to}
      className={cn(
        'relative rounded-md px-3 py-1.5 text-body-sm font-medium transition-colors focus-visible:outline-none focus-visible:shadow-focus-ring',
        isActive
          ? 'text-text-primary'
          : 'text-text-secondary hover:text-text-primary hover:bg-bg-subtle'
      )}
    >
      {children}
      {isActive && (
        <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-accent" aria-hidden />
      )}
    </Link>
  )
}

function ThemeToggle({
  theme,
  setTheme,
}: {
  theme: string
  setTheme: (t: 'light' | 'dark' | 'system') => void
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <IconButton label="Toggle theme" className="text-text-secondary hover:text-text-primary">
          {theme === 'dark' ? (
            <Moon className="h-[18px] w-[18px]" />
          ) : theme === 'light' ? (
            <Sun className="h-[18px] w-[18px]" />
          ) : (
            <Monitor className="h-[18px] w-[18px]" />
          )}
        </IconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-[130px] rounded-xl border border-border bg-surface p-1.5 shadow-lg data-[state=open]:animate-fade-in"
        >
          {(['light', 'dark', 'system'] as const).map((t) => (
            <DropdownMenu.Item
              key={t}
              onSelect={() => setTheme(t)}
              className={cn(
                'flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-body-sm capitalize outline-none transition-colors',
                'hover:bg-bg-subtle focus:bg-bg-subtle',
                theme === t ? 'font-semibold text-accent' : 'text-text-secondary'
              )}
            >
              {t === 'light' && <Sun className="h-3.5 w-3.5" />}
              {t === 'dark' && <Moon className="h-3.5 w-3.5" />}
              {t === 'system' && <Monitor className="h-3.5 w-3.5" />}
              {t}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

function AccountMenu({
  user,
  onLogout,
}: {
  user: { full_name: string; avatar?: string } | null
  onLogout: () => Promise<void>
}) {
  const navigate = useNavigate()
  const initials = user?.full_name?.split(' ').map((n) => n[0]).join('') ?? '?'

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          aria-label="Account menu"
          className="rounded-full focus-visible:outline-none focus-visible:shadow-focus-ring ml-0.5"
        >
          <Avatar src={user?.avatar} fallback={initials} size="sm" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={10}
          className="z-50 min-w-[200px] rounded-xl border border-border bg-surface p-1.5 shadow-lg data-[state=open]:animate-fade-in"
        >
          <div className="px-3 py-2.5 border-b border-border mb-1">
            <p className="text-body-sm font-semibold text-text-primary truncate">{user?.full_name}</p>
          </div>
          {[
            { label: 'My Account', href: ROUTES.ACCOUNT_PROFILE },
            { label: 'Orders', href: ROUTES.ACCOUNT_ORDERS },
            { label: 'Wishlist', href: ROUTES.ACCOUNT_WISHLIST },
            { label: 'Settings', href: ROUTES.ACCOUNT_SETTINGS },
          ].map((item) => (
            <DropdownMenu.Item
              key={item.label}
              onSelect={() => navigate(item.href)}
              className="flex cursor-pointer items-center rounded-lg px-3 py-2 text-body-sm text-text-secondary outline-none transition-colors hover:bg-bg-subtle hover:text-text-primary focus:bg-bg-subtle"
            >
              {item.label}
            </DropdownMenu.Item>
          ))}
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item
            onSelect={() => void onLogout()}
            className="flex cursor-pointer items-center rounded-lg px-3 py-2 text-body-sm text-danger outline-none transition-colors hover:bg-danger-subtle focus:bg-danger-subtle"
          >
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

function MobileNav({
  isAuthenticated,
  currentPath,
  categoryTree,
  isCategoryTreeLoading,
  onClose,
  onLogout,
}: {
  isAuthenticated: boolean
  currentPath: string
  categoryTree: { id: number | string; name: string; slug: string }[] | undefined
  isCategoryTreeLoading: boolean
  onClose: () => void
  onLogout: () => Promise<void>
}) {
  const navigate = useNavigate()
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(true)

  const go = (href: string) => {
    navigate(href)
    onClose()
  }

  const categories = (categoryTree ?? []).map((c) => ({ label: c.name, href: buildRoute.category(c.slug) }))

  const navItems = [
    { label: 'Home', href: ROUTES.HOME },
    { label: 'Shop', href: ROUTES.PRODUCTS },
    { label: 'Track Order', href: ROUTES.TRACK_ORDER },
    { label: 'About', href: ROUTES.ABOUT },
    { label: 'Contact', href: ROUTES.CONTACT },
    { label: 'FAQ', href: ROUTES.FAQ },
  ]

  const accountItems = isAuthenticated
    ? [
        { label: 'My Account', href: ROUTES.ACCOUNT_PROFILE },
        { label: 'My Orders', href: ROUTES.ACCOUNT_ORDERS },
        { label: 'My Wishlist', href: ROUTES.ACCOUNT_WISHLIST },
        { label: 'Settings', href: ROUTES.ACCOUNT_SETTINGS },
      ]
    : [
        { label: 'Sign In', href: ROUTES.LOGIN },
        { label: 'Create Account', href: ROUTES.REGISTER },
      ]

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-overlay/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden
      />
      {/* Panel */}
      <nav
        aria-label="Mobile navigation"
        className="absolute right-0 top-0 h-full w-[280px] bg-surface shadow-xl animate-slide-in-right"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <span className="text-body-md font-semibold text-text-primary">Menu</span>
          <IconButton label="Close menu" size="sm" onClick={onClose}>
            <X className="h-[18px] w-[18px]" />
          </IconButton>
        </div>

        <div className="overflow-y-auto h-[calc(100%-65px)] p-4">
          {/* Categories */}
          <div className="mb-4">
            <button
              type="button"
              onClick={() => setIsCategoriesOpen((v) => !v)}
              className="flex w-full items-center justify-between rounded-lg bg-primary px-3 py-2.5 text-left text-body-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
              aria-expanded={isCategoriesOpen}
            >
              <span className="flex items-center gap-2">
                <Menu className="h-4 w-4" aria-hidden />
                All Categories
              </span>
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', isCategoriesOpen && 'rotate-180')} />
            </button>
            {isCategoriesOpen && (
              <div className="mt-1 space-y-0.5 border-l border-border pl-2">
                {isCategoryTreeLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="mx-3 my-1 h-6 animate-pulse rounded-md bg-bg-subtle" aria-hidden />
                  ))
                ) : categories.length > 0 ? (
                  categories.map((cat) => (
                    <button
                      key={cat.label}
                      onClick={() => go(cat.href)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-body-sm text-text-secondary transition-colors hover:bg-bg-subtle hover:text-text-primary"
                    >
                      <Grid3x3 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      {cat.label}
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-body-sm text-text-tertiary">No categories yet</div>
                )}
              </div>
            )}
          </div>

          {/* Main nav */}
          <div className="space-y-0.5 mb-6 border-t border-border pt-4">
            {navItems.map((item) => {
              const isActive = currentPath === item.href || currentPath.startsWith(item.href + '/')
              return (
                <button
                  key={item.label}
                  onClick={() => go(item.href)}
                  className={cn(
                    'block w-full rounded-lg px-3 py-2.5 text-left text-body-sm font-medium transition-colors',
                    isActive
                      ? 'bg-accent-subtle text-accent'
                      : 'text-text-secondary hover:bg-bg-subtle hover:text-text-primary'
                  )}
                >
                  {item.label}
                </button>
              )
            })}
          </div>

          {/* Account section */}
          <div className="pt-4 border-t border-border">
            <p className="mb-2 px-3 text-caption uppercase tracking-widest text-text-tertiary">
              Account
            </p>
            <div className="space-y-0.5">
              {accountItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => go(item.href)}
                  className="block w-full rounded-lg px-3 py-2.5 text-left text-body-sm text-text-secondary transition-colors hover:bg-bg-subtle hover:text-text-primary"
                >
                  {item.label}
                </button>
              ))}
              {isAuthenticated && (
                <button
                  onClick={() => { void onLogout(); onClose() }}
                  className="block w-full rounded-lg px-3 py-2.5 text-left text-body-sm text-danger transition-colors hover:bg-danger-subtle"
                >
                  Sign out
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>
    </div>
  )
}
