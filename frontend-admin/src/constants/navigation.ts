import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  Boxes,
  ClipboardList,
  LayoutDashboard,
  Megaphone,
  Settings2,
  Users,
} from 'lucide-react'

export interface NavigationItem {
  label: string
  icon: LucideIcon
  available: boolean
  to?: string
}

export interface NavigationSection {
  label: string
  items: NavigationItem[]
}

export const navigationSections: NavigationSection[] = [
  {
    label: 'Workspace',
    items: [{ label: 'Overview', icon: LayoutDashboard, available: true, to: '/' }],
  },
  {
    label: 'Coming next',
    items: [
      { label: 'Catalog', icon: Boxes, available: false },
      { label: 'Orders', icon: ClipboardList, available: false },
      { label: 'Customers', icon: Users, available: false },
      { label: 'Marketing', icon: Megaphone, available: false },
      { label: 'Analytics', icon: BarChart3, available: false },
      { label: 'Settings', icon: Settings2, available: false },
    ],
  },
]