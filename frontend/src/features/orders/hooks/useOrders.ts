import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ordersService, type OrderListParams } from '@/services/api/orders.service'
import { queryKeys } from '@/services/queryKeys'
import { useToast } from '@/contexts/ToastContext'
import { useAuthEnabled } from '@/hooks/useAuthEnabled'

export function useOrders(params: OrderListParams = {}) {
  const enabled = useAuthEnabled()
  return useQuery({
    queryKey: queryKeys.orders.list(params),
    queryFn: ({ signal }) => ordersService.getOrders(params, { signal }),
    staleTime: 0,
    enabled,
  })
}

export function useOrder(orderNumber: string) {
  const enabled = useAuthEnabled()
  return useQuery({
    queryKey: queryKeys.orders.detail(orderNumber),
    queryFn: ({ signal }) => ordersService.getOrder(orderNumber, { signal }),
    // Both auth AND data guards are required: auth prevents unauthenticated
    // requests during bootstrap/post-logout; !!orderNumber prevents a fetch
    // when no order is selected yet.
    enabled: enabled && !!orderNumber,
    staleTime: 0,
  })
}

export function useTrackOrder() {
  return useMutation({
    mutationFn: (payload: { order_number: string; email: string }) =>
      ordersService.trackOrder(payload),
  })
}

export function useCancelOrder() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (orderNumber: string) => ordersService.cancelOrder(orderNumber),
    onSuccess: (_data, orderNumber) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(orderNumber) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.list() })
      toast({ title: 'Order cancelled', variant: 'success' })
    },
    onError: () => {
      toast({ title: 'Could not cancel order', variant: 'error' })
    },
  })
}
