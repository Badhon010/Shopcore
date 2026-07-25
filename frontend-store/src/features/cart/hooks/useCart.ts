import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cartService, type AddToCartPayload, type UpdateCartItemPayload } from '@/services/api/cart.service'
import { queryKeys } from '@/services/queryKeys'
import { useToast } from '@/contexts/ToastContext'
import { useAuthEnabled } from '@/hooks/useAuthEnabled'
import type { Cart } from '@/types/models'

export function useCart() {
  const enabled = useAuthEnabled()
  return useQuery({
    queryKey: queryKeys.cart.detail(),
    queryFn: ({ signal }) => cartService.getCart({ signal }),
    staleTime: 0,
    retry: false,
    enabled,
  })
}

export function useAddToCart() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (payload: AddToCartPayload) => cartService.addItem(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.cart.detail(), data)
      toast({ title: 'Added to cart', variant: 'success' })
    },
    onError: () => {
      toast({ title: 'Could not add to cart', variant: 'error' })
    },
  })
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ itemId, payload }: { itemId: string; payload: UpdateCartItemPayload }) =>
      cartService.updateItem(itemId, payload),
    onMutate: async ({ itemId, payload }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.cart.detail() })
      const previousCart = queryClient.getQueryData<Cart>(queryKeys.cart.detail())
      if (previousCart) {
        queryClient.setQueryData<Cart>(queryKeys.cart.detail(), {
          ...previousCart,
          items: previousCart.items.map((item) =>
            item.id === itemId ? { ...item, quantity: payload.quantity } : item
          ),
        })
      }
      return { previousCart }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(queryKeys.cart.detail(), context.previousCart)
      }
      toast({ title: 'Could not update cart', variant: 'error' })
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart.detail() })
    },
  })
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (itemId: string) => cartService.removeItem(itemId),
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.cart.detail() })
      const previousCart = queryClient.getQueryData<Cart>(queryKeys.cart.detail())
      if (previousCart) {
        queryClient.setQueryData<Cart>(queryKeys.cart.detail(), {
          ...previousCart,
          items: previousCart.items.filter((item) => item.id !== itemId),
          item_count: Math.max(0, previousCart.item_count - 1),
        })
      }
      return { previousCart }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(queryKeys.cart.detail(), context.previousCart)
      }
      toast({ title: 'Could not remove item', variant: 'error' })
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart.detail() })
    },
  })
}

// The apply-coupon endpoint returns a discount *preview* (code/discount
// fields), not a Cart — it must be merged into the existing cart shape
// rather than replacing it, or cart rendering/checkout break.
export function useApplyCoupon() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (code: string) => cartService.applyCoupon(code),
    onSuccess: (result) => {
      queryClient.setQueryData<Cart>(queryKeys.cart.detail(), (previousCart) => {
        if (!previousCart) return previousCart
        return {
          ...previousCart,
          discount: result.discount_amount,
          coupon: {
            id: result.code,
            code: result.code,
            discount_type: result.discount_type,
            discount_value: result.discount_value,
          },
          total: result.subtotal_after_discount,
        }
      })
      toast({ title: 'Coupon applied', variant: 'success' })
    },
    onError: (error: { message?: string }) => {
      toast({
        title: 'Invalid coupon',
        description: error?.message ?? 'This coupon code is not valid or has expired.',
        variant: 'error',
      })
    },
  })
}

// The backend does not persist an applied coupon on the cart resource — it
// only exposes a stateless "apply" preview endpoint — so there is nothing to
// remove server-side. This simply clears the coupon from the client cache
// and restores the pre-discount total.
export function useRemoveCoupon() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => {
      queryClient.setQueryData<Cart>(queryKeys.cart.detail(), (previousCart) => {
        if (!previousCart) return previousCart
        const discount = Number(previousCart.discount ?? 0)
        const total = (Number(previousCart.total) + discount).toString()
        return { ...previousCart, coupon: undefined, discount: undefined, total }
      })
    },
  })
}
