import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { wishlistService } from '@/services/api/wishlist.service'
import { queryKeys } from '@/services/queryKeys'
import { useToast } from '@/contexts/ToastContext'
import { useAuthEnabled } from '@/hooks/useAuthEnabled'
import type { WishlistItem } from '@/types/models'

export function useWishlist() {
  const enabled = useAuthEnabled()
  return useQuery({
    queryKey: queryKeys.wishlist.list(),
    queryFn: ({ signal }) => wishlistService.getWishlist({ signal }),
    enabled,
    staleTime: 30 * 1000,
  })
}

export function useToggleWishlist() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({
      productId,
      isCurrentlyWishlisted,
    }: {
      productId: string
      isCurrentlyWishlisted: boolean
    }) =>
      isCurrentlyWishlisted
        ? wishlistService.removeItem(productId)
        : wishlistService.addItem(productId),

    onMutate: async ({ productId, isCurrentlyWishlisted }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.wishlist.list() })
      const previous = queryClient.getQueryData<WishlistItem[]>(queryKeys.wishlist.list())

      if (previous) {
        if (isCurrentlyWishlisted) {
          queryClient.setQueryData<WishlistItem[]>(
            queryKeys.wishlist.list(),
            previous.filter((w) => w.product.id !== productId)
          )
        }
      }
      return { previous }
    },

    onSuccess: (_data, { isCurrentlyWishlisted }) => {
      toast({
        title: isCurrentlyWishlisted ? 'Removed from wishlist' : 'Added to wishlist',
        variant: 'success',
      })
      void queryClient.invalidateQueries({ queryKey: queryKeys.wishlist.list() })
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.wishlist.list(), context.previous)
      }
      toast({ title: 'Could not update wishlist', variant: 'error' })
    },
  })
}
