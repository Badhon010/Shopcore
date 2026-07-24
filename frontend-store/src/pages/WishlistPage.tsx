import { Helmet } from 'react-helmet-async'
import { Heart } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { EmptyState } from '@/components/feedback/EmptyState'
import { Spinner } from '@/components/feedback/Spinner'
import { ProductGrid } from '@/features/catalog/components/ProductGrid'
import { useWishlist } from '@/features/wishlist/hooks/useWishlist'
import { ROUTES } from '@/constants/routes'

export function WishlistPage() {
  const navigate = useNavigate()
  const { data: wishlist, isLoading } = useWishlist()

  const products = wishlist?.map((w) => w.product) ?? []

  return (
    <>
      <Helmet>
        <title>My Wishlist — ShopCore</title>
      </Helmet>
      <div>
        <h1 className="text-heading-lg font-semibold text-text-primary mb-6">
          My Wishlist ({products.length})
        </h1>
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : !products.length ? (
          <EmptyState
            icon={<Heart className="h-8 w-8" />}
            title="Your wishlist is empty"
            description="Save items you love to your wishlist."
            action={{ label: 'Browse products', onClick: () => navigate(ROUTES.PRODUCTS) }}
          />
        ) : (
          <ProductGrid products={products} />
        )}
      </div>
    </>
  )
}
