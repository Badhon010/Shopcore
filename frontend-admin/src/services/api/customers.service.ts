import { axiosClient } from './axiosClient'
import { endpoints } from './endpoints'
import type { User } from '@/types/models'
import type { PaginatedResponse, ListParams } from '@/types/api'

export const customersService = {
  async listCustomers(params?: ListParams): Promise<PaginatedResponse<User>> {
    const res = await axiosClient.get<PaginatedResponse<User>>(
      endpoints.customers.list(), { params }
    )
    return res.data
  },

  async getCustomer(id: string): Promise<User> {
    const res = await axiosClient.get<User>(endpoints.customers.detail(id))
    return res.data
  },

  async updateCustomer(id: string, data: Partial<User>): Promise<User> {
    const res = await axiosClient.patch<User>(endpoints.customers.detail(id), data)
    return res.data
  },
}
