import { Outlet, NavLink } from 'react-router-dom'
import { User, ShoppingBag, MapPin, Heart, Bell, Settings } from 'lucide-react'
import { ROUTES } from '@/constants/routes'
import { PageContainer } from '@/components/layout/PageContainer'
import { cn } from '@/utils/cn'

const sidebarLinks = [
  { label: 'Profile', href: ROUTES.ACCOUNT_PROFILE, icon: User },
  { label: 'Orders', href: ROUTES.ACCOUNT_ORDERS, icon: ShoppingBag },
  { label: 'Addresses', href: ROUTES.ACCOUNT_ADDRESSES, icon: MapPin },
  { label: 'Wishlist', href: ROUTES.ACCOUNT_WISHLIST, icon: Heart },
  { label: 'Notifications', href: ROUTES.ACCOUNT_NOTIFICATIONS, icon: Bell },
  { label: 'Settings', href: ROUTES.ACCOUNT_SETTINGS, icon: Settings },
]

export function AccountLayout() {
  return (
    <PageContainer className="py-8 md:py-12">
      <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
        {/* Sidebar */}
        <aside className="shrink-0 lg:w-56">
          <nav aria-label="Account navigation">
            <ul className="flex flex-row flex-wrap gap-1 lg:flex-col">
              {sidebarLinks.map(({ label, href, icon: Icon }) => (
                <li key={label}>
                  <NavLink
                    to={href}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 rounded-md px-3 py-2 text-body-sm font-medium transition-colors',
                        'focus-visible:outline-none focus-visible:shadow-focus-ring',
                        isActive
                          ? 'bg-accent-subtle text-accent'
                          : 'text-text-secondary hover:bg-bg-subtle hover:text-text-primary'
                      )
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <Outlet />
        </div>
      </div>
    </PageContainer>
  )
}
