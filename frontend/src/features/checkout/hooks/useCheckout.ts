import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  checkoutService,
  type PlaceOrderPayload,
  type InitiatePaymentPayload,
} from '@/services/api/checkout.service'
import { queryKeys } from '@/services/queryKeys'

/**
 * Place a new order via POST /orders/checkout/.
 * Invalidates the cart cache on success so item counts update immediately.
 */
export function usePlaceOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: PlaceOrderPayload) => checkoutService.placeOrder(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart.detail() })
    },
  })
}

/**
 * Initiate payment for a placed order via POST /payments/initiate/.
 * In v1 only the MANUAL provider is supported (cash-on-delivery / immediate).
 */
export function useInitiatePayment() {
  return useMutation({
    mutationFn: (payload: InitiatePaymentPayload) => checkoutService.initiatePayment(payload),
  })
}
