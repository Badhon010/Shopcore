import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  checkoutService,
  type CheckoutSessionPayload,
  type PlaceOrderPayload,
} from '@/services/api/checkout.service'
import { queryKeys } from '@/services/queryKeys'

export function useCheckoutSession() {
  return useQuery({
    queryKey: queryKeys.checkout.session(),
    queryFn: ({ signal }) => checkoutService.getSession({ signal }),
    staleTime: 0,
  })
}

export function useUpdateCheckoutSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CheckoutSessionPayload) => checkoutService.updateSession(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.checkout.session(), data)
    },
  })
}

export function useShippingMethods() {
  return useQuery({
    queryKey: queryKeys.checkout.shippingMethods(),
    queryFn: ({ signal }) => checkoutService.getShippingMethods({ signal }),
  })
}

export function usePlaceOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: PlaceOrderPayload) => checkoutService.placeOrder(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart.detail() })
    },
  })
}

export function usePaymentIntent() {
  return useMutation({
    mutationFn: () => checkoutService.createPaymentIntent(),
  })
}
