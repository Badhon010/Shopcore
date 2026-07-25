import { axiosClient } from './axiosClient'
import { endpoints } from './endpoints'
import type { Notification } from '@/types/models'
import type { PaginatedResponse, ListParams } from '@/types/api'

export const notificationsService = {
  getNotifications: (params: ListParams = {}, { signal }: { signal?: AbortSignal } = {}) =>
    axiosClient
      .get<PaginatedResponse<Notification>>(endpoints.notifications.list(), { params, signal })
      .then((r) => r.data),

  markRead: (id: string) =>
    axiosClient
      .post<Notification>(endpoints.notifications.markRead(id))
      .then((r) => r.data),

  markAllRead: () =>
    axiosClient
      .post(endpoints.notifications.markAllRead())
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      .then((r) => r.data),
}
