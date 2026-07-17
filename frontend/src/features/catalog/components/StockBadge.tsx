import { Badge } from '@/components/ui/Badge'
import { APP_CONFIG } from '@/constants/config'
import type { StockStatus } from '@/types/models'

interface StockBadgeProps {
  stock?: number
  inStock: boolean
  status?: StockStatus
}

export function StockBadge({ stock, inStock, status }: StockBadgeProps) {
  if (status === 'backorder') {
    return <Badge variant="warning">Available on backorder</Badge>
  }

  if (!inStock || (stock !== undefined && stock === 0)) {
    return <Badge variant="danger">Out of stock</Badge>
  }

  if (stock !== undefined && stock <= APP_CONFIG.lowStockThreshold) {
    return <Badge variant="warning">Low stock — {stock} left</Badge>
  }

  return <Badge variant="success">In stock</Badge>
}
