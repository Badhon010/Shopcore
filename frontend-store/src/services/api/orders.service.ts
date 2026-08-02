import { axiosClient } from './axiosClient'
import { endpoints } from './endpoints'
import type { Order } from '@/types/models'
import type { PaginatedResponse, ListParams } from '@/types/api'

export interface TrackOrderPayload {
  order_number: string
  /** Email used at checkout (registered orders; optional for guests). */
  email?: string
  /** Phone used at checkout — enough on its own for guest orders (audit H-4). */
  phone_number?: string
  /** One-time guest lookup token (guest orders only). */
  lookup_token?: string
}

export interface OrderListParams extends ListParams {
  status?: string
  date_from?: string
  date_to?: string
}

export const ordersService = {
  getOrders: (params: OrderListParams = {}, { signal }: { signal?: AbortSignal } = {}) =>
    axiosClient
      .get<PaginatedResponse<Order>>(endpoints.orders.list(), { params, signal })
      .then((r) => r.data),

  getOrder: (orderNumber: string, { signal }: { signal?: AbortSignal } = {}) =>
    axiosClient
      .get<Order>(endpoints.orders.detail(orderNumber), { signal })
      .then((r) => r.data),

  trackOrder: (payload: TrackOrderPayload) =>
    axiosClient
      .post<Order>(endpoints.orders.track(), payload)
      .then((r) => r.data),

  cancelOrder: (orderNumber: string) =>
    axiosClient
      .post<Order>(endpoints.orders.cancel(orderNumber))
      .then((r) => r.data),
}
