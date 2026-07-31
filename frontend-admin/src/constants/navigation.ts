import {
  LayoutDashboard,
  Package,
  FolderOpen,
  Tag,
  Layers,
  Image,
  ShoppingCart,
  Users,
  Ticket,
  Star,
  Megaphone,
  Mail,
  BarChart2,
  Bell,
  Settings,
  Download,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { ROUTES } from './routes'

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  badge?: number
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', href: ROUTES.DASHBOARD, icon: LayoutDashboard },
      { label: 'Analytics',  href: ROUTES.ANALYTICS,  icon: BarChart2 },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { label: 'Products',   href: ROUTES.PRODUCTS,   icon: Package },
      { label: 'Categories', href: ROUTES.CATEGORIES,  icon: FolderOpen },
      { label: 'Brands',     href: ROUTES.BRANDS,      icon: Tag },
      { label: 'Inventory',  href: ROUTES.INVENTORY,   icon: Layers },
      { label: 'Banners',    href: ROUTES.BANNERS,     icon: Image },
    ],
  },
  {
    label: 'Commerce',
    items: [
      { label: 'Orders',    href: ROUTES.ORDERS,    icon: ShoppingCart },
      { label: 'Customers', href: ROUTES.CUSTOMERS, icon: Users },
      { label: 'Coupons',   href: ROUTES.COUPONS,   icon: Ticket },
    ],
  },
  {
    label: 'Engagement',
    items: [
      { label: 'Reviews',    href: ROUTES.REVIEWS,    icon: Star },
      { label: 'Marketing',  href: ROUTES.MARKETING,  icon: Megaphone },
      { label: 'Contact',    href: ROUTES.CONTACT,    icon: Mail },
    ],
  },
  {
    label: 'Data',
    items: [
      { label: 'Exports', href: ROUTES.EXPORTS, icon: Download },
    ],
  },
  {
    label: 'Account',
    items: [
      { label: 'Notifications', href: ROUTES.NOTIFICATIONS, icon: Bell },
      { label: 'Settings',      href: ROUTES.SETTINGS,      icon: Settings },
    ],
  },
]
