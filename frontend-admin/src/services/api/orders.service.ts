import { axiosClient } from './axiosClient'
import { endpoints } from './endpoints'
import type { Order, OrderStats } from '@/types/models'
import type { PaginatedResponse, ListParams } from '@/types/api'

export interface AdminOrderParams extends ListParams {
  status?: string
  payment_status?: string
  date_from?: string
  date_to?: string
  ordering?: string
}

export const ordersService = {
  async listOrders(params?: AdminOrderParams): Promise<PaginatedResponse<Order>> {
    const res = await axiosClient.get<PaginatedResponse<Order>>(
      endpoints.orders.adminList(), { params }
    )
    return res.data
  },

  async getOrderStats(): Promise<OrderStats> {
    const res = await axiosClient.get<OrderStats>(endpoints.orders.adminStats())
    return res.data
  },

  async getOrder(orderNumber: string): Promise<Order> {
    const res = await axiosClient.get<Order>(endpoints.orders.adminDetail(orderNumber))
    return res.data
  },

  async transitionOrder(orderNumber: string, status: string): Promise<Order> {
    const res = await axiosClient.post<Order>(endpoints.orders.transition(orderNumber), { status })
    return res.data
  },

  async cancelOrder(orderNumber: string): Promise<Order> {
    const res = await axiosClient.post<Order>(endpoints.orders.cancel(orderNumber))
    return res.data
  },

  /** Staff refund of a paid order (audit C-2). Returns the created Refund. */
  async refundOrder(orderNumber: string, payload: { reason?: string; amount?: string }): Promise<Refund> {
    const res = await axiosClient.post<Refund>(endpoints.orders.refund(orderNumber), payload)
    return res.data
  },
}

export interface Refund {
  id: string
  order: string
  order_number: string
  amount: string
  currency: string
  reason?: string
  status: 'SUCCEEDED' | 'PENDING' | 'FAILED'
  created_by_email?: string | null
  refunded_at?: string
  created_at: string
}
