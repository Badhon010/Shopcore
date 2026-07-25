import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  Bell,
  Boxes,
  ClipboardList,
  LayoutDashboard,
  Megaphone,
  PackageSearch,
  Settings2,
  Star,
  Tag,
  Users,
} from 'lucide-react'

export interface NavigationItem {
  label: string
  icon: LucideIcon
  available: boolean
  to?: string
  children?: NavigationItem[]
}

export interface NavigationSection {
  label: string
  items: NavigationItem[]
}

export const navigationSections: NavigationSection[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, available: true, to: '/' },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { label: 'Products', icon: Boxes, available: true, to: '/catalog/products' },
      { label: 'Categories', icon: Tag, available: true, to: '/catalog/categories' },
      { label: 'Brands', icon: Star, available: true, to: '/catalog/brands' },
      { label: 'Inventory', icon: PackageSearch, available: true, to: '/catalog/inventory' },
    ],
  },
  {
    label: 'Commerce',
    items: [
      { label: 'Orders', icon: ClipboardList, available: true, to: '/orders' },
      { label: 'Customers', icon: Users, available: true, to: '/customers' },
      { label: 'Coupons', icon: Tag, available: true, to: '/coupons' },
    ],
  },
  {
    label: 'Engagement',
    items: [
      { label: 'Reviews', icon: Star, available: true, to: '/reviews' },
      { label: 'Marketing', icon: Megaphone, available: true, to: '/marketing' },
      { label: 'Notifications', icon: Bell, available: true, to: '/notifications' },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Analytics', icon: BarChart3, available: true, to: '/analytics' },
      { label: 'Settings', icon: Settings2, available: true, to: '/settings' },
    ],
  },
]
