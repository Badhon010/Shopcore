import { axiosClient } from './axiosClient'
import { endpoints } from './endpoints'
import type { User } from '@/types/models'
import type { PaginatedResponse } from '@/types/api'

export interface CustomerListParams {
  page?: number
  page_size?: number
  search?: string
  is_active?: boolean
  is_staff?: boolean
  ordering?: string
}

export const customersService = {
  async getCustomers(params?: CustomerListParams): Promise<PaginatedResponse<User>> {
    const res = await axiosClient.get<PaginatedResponse<User>>(endpoints.customers.list(), { params })
    return res.data
  },

  async getCustomer(id: string): Promise<User> {
    const res = await axiosClient.get<User>(endpoints.customers.detail(id))
    return res.data
  },
}
