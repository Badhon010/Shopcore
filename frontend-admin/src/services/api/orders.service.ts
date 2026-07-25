import { axiosClient } from './axiosClient'
import { endpoints } from './endpoints'
import type { Order, OrderStatus } from '@/types/models'
import type { PaginatedResponse } from '@/types/api'

export interface OrderListParams {
  page?: number
  page_size?: number
  search?: string
  status?: OrderStatus
  payment_status?: string
  ordering?: string
}

export const ordersService = {
  async getOrders(params?: OrderListParams): Promise<PaginatedResponse<Order>> {
    const res = await axiosClient.get<PaginatedResponse<Order>>(endpoints.orders.adminList(), { params })
    return res.data
  },

  async getOrder(orderNumber: string): Promise<Order> {
    const res = await axiosClient.get<Order>(endpoints.orders.detail(orderNumber))
    return res.data
  },

  async transitionOrder(orderNumber: string, status: OrderStatus, note?: string): Promise<Order> {
    const res = await axiosClient.post<Order>(endpoints.orders.transition(orderNumber), { status, note })
    return res.data
  },

  async cancelOrder(orderNumber: string): Promise<Order> {
    const res = await axiosClient.post<Order>(endpoints.orders.cancel(orderNumber))
    return res.data
  },
}
