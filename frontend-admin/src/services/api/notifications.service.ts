import { axiosClient } from './axiosClient'
import { endpoints } from './endpoints'
import type { Notification } from '@/types/models'
import type { PaginatedResponse } from '@/types/api'

export const notificationsService = {
  async getNotifications(params?: { page?: number; page_size?: number }): Promise<PaginatedResponse<Notification>> {
    const res = await axiosClient.get<PaginatedResponse<Notification>>(endpoints.notifications.list(), { params })
    return res.data
  },

  async markRead(id: number): Promise<Notification> {
    const res = await axiosClient.post<Notification>(endpoints.notifications.markRead(id))
    return res.data
  },

  async markAllRead(): Promise<void> {
    await axiosClient.post(endpoints.notifications.markAllRead())
  },
}
