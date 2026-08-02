import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  checkoutService,
  type GuestPlaceOrderPayload,
  type InitiatePaymentPayload,
  type PlaceOrderPayload,
} from '@/services/api/checkout.service'
import { paymentsService, type SubmitManualPaymentPayload } from '@/services/api/payments.service'
import { queryKeys } from '@/services/queryKeys'

/**
 * Enabled payment methods for the checkout (GET /payments/methods/).
 * Public — always available, no auth gating.
 */
export function usePaymentMethods() {
  return useQuery({
    queryKey: queryKeys.payments.methods(),
    queryFn: ({ signal }) => paymentsService.getPaymentMethods({ signal }),
    staleTime: 60_000,
    retry: 1,
  })
}

/**
 * Place a new order via POST /orders/checkout/ (registered user).
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
 * Place a new order as a guest (audit H-4) — sends the X-Cart-Token header
 * so the backend can attach the guest cart + guest_session_id.
 */
export function usePlaceGuestOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: GuestPlaceOrderPayload) => checkoutService.placeGuestOrder(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart.detail() })
    },
  })
}

/**
 * Initiate payment for a placed order via POST /payments/initiate/.
 * Manual providers confirm immediately; gateways return client_secret / redirect_url.
 */
export function useInitiatePayment() {
  return useMutation({
    mutationFn: (payload: InitiatePaymentPayload) => checkoutService.initiatePayment(payload),
  })
}

/**
 * Submit a manual (offline) payment for staff verification via POST /payments/submit/.
 */
export function useSubmitManualPayment() {
  return useMutation({
    mutationFn: (payload: SubmitManualPaymentPayload) => paymentsService.submitManualPayment(payload),
  })
}
