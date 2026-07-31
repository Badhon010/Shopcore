import { axiosClient } from './axiosClient'
import { endpoints } from './endpoints'
import type { User } from '@/types/models'
import type { PaginatedResponse, ListParams } from '@/types/api'

export type BulkAction = 'activate' | 'deactivate' | 'promote_staff' | 'remove_staff'

export interface BulkActionResult {
  updated: number
  errors: Array<{ id: number; error: string }>
}

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
    const res = await axiosClient.patch<User>(endpoints.customers.update(id), data)
    return res.data
  },

  async activateUser(id: string): Promise<User> {
    const res = await axiosClient.post<User>(endpoints.customers.activate(id))
    return res.data
  },

  async deactivateUser(id: string): Promise<User> {
    const res = await axiosClient.post<User>(endpoints.customers.deactivate(id))
    return res.data
  },

  async suspendUser(id: string): Promise<User> {
    const res = await axiosClient.post<User>(endpoints.customers.suspend(id))
    return res.data
  },

  async promoteStaff(id: string): Promise<User> {
    const res = await axiosClient.post<User>(endpoints.customers.promoteStaff(id))
    return res.data
  },

  async removeStaff(id: string): Promise<User> {
    const res = await axiosClient.post<User>(endpoints.customers.removeStaff(id))
    return res.data
  },

  async resetPassword(id: string): Promise<void> {
    await axiosClient.post(endpoints.customers.resetPassword(id))
  },

  async forceVerifyEmail(id: string): Promise<User> {
    const res = await axiosClient.post<User>(endpoints.customers.verifyEmail(id))
    return res.data
  },

  async bulkAction(action: BulkAction, ids: string[]): Promise<BulkActionResult> {
    const res = await axiosClient.post<BulkActionResult>(endpoints.customers.bulkAction(), {
      action,
      ids: ids.map(Number),
    })
    return res.data
  },
}
