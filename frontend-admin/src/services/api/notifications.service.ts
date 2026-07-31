import { axiosClient } from './axiosClient'
import { endpoints } from './endpoints'
import type { Notification } from '@/types/models'
import type { PaginatedResponse, ListParams } from '@/types/api'

export const notificationsService = {
  async listNotifications(params?: ListParams): Promise<PaginatedResponse<Notification>> {
    const res = await axiosClient.get<PaginatedResponse<Notification>>(
      endpoints.notifications.list(), { params }
    )
    return res.data
  },

  async getUnreadCount(): Promise<number> {
    const res = await axiosClient.get<{ unread_count: number }>(endpoints.notifications.unreadCount())
    return res.data.unread_count
  },

  async markRead(pk: string): Promise<Notification> {
    const res = await axiosClient.post<Notification>(endpoints.notifications.markRead(pk))
    return res.data
  },

  async markAllRead(): Promise<void> {
    await axiosClient.post(endpoints.notifications.markAllRead())
  },

  async bulkMarkRead(ids: string[]): Promise<void> {
    await axiosClient.post(endpoints.notifications.bulkMarkRead(), { ids })
  },

  async deleteNotification(pk: string): Promise<void> {
    await axiosClient.delete(endpoints.notifications.delete(pk))
  },

  async bulkDelete(ids: string[]): Promise<void> {
    await axiosClient.delete(endpoints.notifications.bulkDelete(), { data: { ids } })
  },

  async clearAll(): Promise<void> {
    await axiosClient.post(endpoints.notifications.clearAll())
  },
}
