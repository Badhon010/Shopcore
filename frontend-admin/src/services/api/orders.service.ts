import { axiosClient } from './axiosClient'
import { endpoints } from './endpoints'
import type { Order, OrderStats } from '@/types/models'
import type { PaginatedResponse, ListParams } from '@/types/api'

export interface AdminOrderParams extends ListParams {
  status?: string
  payment_status?: string
  date_from?: string
  date_to?: string
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
    const res = await axiosClient.get<Order>(endpoints.orders.detail(orderNumber))
    return res.data
  },

  async transitionOrder(orderNumber: string, status: string): Promise<Order> {
    const res = await axiosClient.post<Order>(endpoints.orders.transition(orderNumber), { status })
    return res.data
  },
}
