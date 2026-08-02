import { Link } from 'react-router-dom'
import { Plus, Package, ShoppingCart, Users, Ticket, Download } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import { IconButton } from '@/components/ui/IconButton'
import { ROUTES } from '@/constants/routes'

const QUICK_ACTIONS = [
  { label: 'New product', href: ROUTES.PRODUCTS, icon: Package },
  { label: 'New order', href: ROUTES.ORDERS, icon: ShoppingCart },
  { label: 'New coupon', href: ROUTES.COUPONS, icon: Ticket },
  { label: 'Add customer', href: ROUTES.CUSTOMERS, icon: Users },
  { label: 'Export data', href: ROUTES.EXPORTS, icon: Download },
]

/**
 * Topbar quick-actions menu — fast links to the most common admin tasks.
 */
export function QuickActions() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton icon={<Plus className="h-4 w-4" />} label="Quick actions" variant="surface" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Quick actions</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border-light" />
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon
          return (
            <DropdownMenuItem key={action.label} asChild>
              <Link to={action.href}>
                <Icon className="h-4 w-4" aria-hidden />
                {action.label}
              </Link>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
