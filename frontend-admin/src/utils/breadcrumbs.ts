import { NAV_GROUPS } from '@/constants/navigation'
import { ROUTES } from '@/constants/routes'

export interface Crumb {
  label: string
  href?: string
}

interface RouteCrumb {
  /** Path pattern. `:param` segments are replaced with the actual value. */
  pattern: string
  label: string
  /** Parent crumbs to prepend (by href). */
  parent?: string
}

/**
 * Route → crumb mapping. Order matters: more specific patterns first.
 * Detail routes use `:slug` style tokens so the actual value is shown as the
 * final (current) crumb.
 */
const ROUTE_CRUMBS: RouteCrumb[] = [
  { pattern: ROUTES.DASHBOARD, label: 'Dashboard' },
  { pattern: ROUTES.ANALYTICS, label: 'Analytics' },
  { pattern: '/catalog/products/:slug', label: 'Products', parent: ROUTES.PRODUCTS },
  { pattern: ROUTES.PRODUCTS, label: 'Products' },
  { pattern: ROUTES.CATEGORIES, label: 'Categories' },
  { pattern: ROUTES.BRANDS, label: 'Brands' },
  { pattern: ROUTES.INVENTORY, label: 'Inventory' },
  { pattern: ROUTES.BANNERS, label: 'Banners' },
  { pattern: '/orders/:orderNumber', label: 'Orders', parent: ROUTES.ORDERS },
  { pattern: ROUTES.ORDERS, label: 'Orders' },
  { pattern: '/customers/:id', label: 'Customers', parent: ROUTES.CUSTOMERS },
  { pattern: ROUTES.CUSTOMERS, label: 'Customers' },
  { pattern: ROUTES.COUPONS, label: 'Coupons' },
  { pattern: ROUTES.REVIEWS, label: 'Reviews' },
  { pattern: ROUTES.MARKETING, label: 'Marketing' },
  { pattern: ROUTES.CONTACT, label: 'Contact' },
  { pattern: ROUTES.NOTIFICATIONS, label: 'Notifications' },
  { pattern: ROUTES.SETTINGS, label: 'Settings' },
  { pattern: ROUTES.EXPORTS, label: 'Exports' },
]

/**
 * Humanise a URL segment, e.g. "wireless-headphones" → "Wireless Headphones".
 * Codes and identifiers containing digits (e.g. order numbers) are kept as-is.
 */
function humanizeSegment(segment: string): string {
  if (/[0-9]/.test(segment)) return segment
  return segment
    .replace(/[-_]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function pathMatches(pattern: string, pathname: string): { matches: boolean; params: Record<string, string> } {
  const patternParts = pattern.split('/').filter(Boolean)
  const pathParts = pathname.split('/').filter(Boolean)
  if (patternParts.length !== pathParts.length) return { matches: false, params: {} }

  const params: Record<string, string> = {}
  for (let i = 0; i < patternParts.length; i++) {
    const pp = patternParts[i]!
    const sp = pathParts[i]!
    if (pp.startsWith(':')) {
      params[pp.slice(1)] = decodeURIComponent(sp)
    } else if (pp !== sp) {
      return { matches: false, params: {} }
    }
  }
  return { matches: true, params }
}

/**
 * Resolve a breadcrumb trail for the given pathname.
 * Returns an ordered list of crumbs (last one is the current page).
 */
export function getBreadcrumbs(pathname: string): Crumb[] {
  if (pathname === ROUTES.DASHBOARD || pathname === '/') {
    return [{ label: 'Dashboard' }]
  }

  // Find the nav group a route belongs to (for the section label crumb).
  const sectionFor = (href: string): string | null => {
    for (const group of NAV_GROUPS) {
      if (group.items.some((item) => item.href === href)) return group.label
    }
    return null
  }

  // Match the most specific (longest pattern) route first.
  const sorted = [...ROUTE_CRUMBS].sort((a, b) => b.pattern.length - a.pattern.length)
  for (const crumb of sorted) {
    const { matches, params } = pathMatches(crumb.pattern, pathname)
    if (!matches) continue

    const crumbs: Crumb[] = []

    // Section label (e.g. "Catalog") — non-navigable, gives context.
    const section = sectionFor(crumb.parent ?? crumb.pattern)
    if (section && crumb.pattern !== ROUTES.DASHBOARD) {
      crumbs.push({ label: section })
    }

    // Parent crumb (e.g. "Products" before a product detail).
    if (crumb.parent) {
      const parent = ROUTE_CRUMBS.find((r) => r.pattern === crumb.parent)
      if (parent) {
        crumbs.push({ label: parent.label, href: parent.pattern })
      }
    }

    // The current crumb — for detail routes, show the actual entity value.
    const paramKey = Object.keys(params)[0]
    const finalLabel = paramKey ? humanizeSegment(params[paramKey]!) : crumb.label
    crumbs.push({ label: finalLabel })

    return crumbs
  }

  // Fallback: derive from nav groups for any unlisted route.
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (pathname.startsWith(item.href) && item.href !== ROUTES.DASHBOARD) {
        return [
          { label: group.label },
          { label: item.label, href: item.href },
        ]
      }
    }
  }

  return [{ label: 'Admin' }]
}
