import { Heart } from 'lucide-react'
import { cn } from '@/utils/cn'
import { IconButton } from '@/components/ui/IconButton'
import { useWishlist, useToggleWishlist } from '../hooks/useWishlist'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'

interface WishlistButtonProps {
  productId: string
  className?: string
}

export function WishlistButton({ productId, className }: WishlistButtonProps) {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const { data: wishlist } = useWishlist()
  const toggle = useToggleWishlist()

  const isWishlisted = wishlist?.some((w) => w.product.id === productId) ?? false

  const handleClick = () => {
    if (!isAuthenticated) {
      navigate(ROUTES.LOGIN)
      return
    }
    toggle.mutate({ productId, isCurrentlyWishlisted: isWishlisted })
  }

  return (
    <IconButton
      label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
      variant="secondary"
      onClick={handleClick}
      disabled={toggle.isPending}
      className={className}
    >
      <Heart
        className={cn(
          'h-4 w-4 transition-colors',
          isWishlisted ? 'fill-danger text-danger' : 'text-text-secondary'
        )}
      />
    </IconButton>
  )
}
