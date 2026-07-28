import { axiosClient } from './axiosClient'
import { endpoints } from './endpoints'
import type { ContactMessage } from '@/types/models'
import type { PaginatedResponse, ListParams } from '@/types/api'

export const contactService = {
  async listMessages(params?: ListParams): Promise<PaginatedResponse<ContactMessage>> {
    const res = await axiosClient.get<PaginatedResponse<ContactMessage>>(
      endpoints.contact.adminMessages(), { params }
    )
    return res.data
  },

  async getMessage(pk: string): Promise<ContactMessage> {
    const res = await axiosClient.get<ContactMessage>(endpoints.contact.adminMessage(pk))
    return res.data
  },

  async resolveMessage(pk: string): Promise<ContactMessage> {
    const res = await axiosClient.post<ContactMessage>(endpoints.contact.adminResolve(pk))
    return res.data
  },

  async markNew(pk: string): Promise<ContactMessage> {
    const res = await axiosClient.post<ContactMessage>(endpoints.contact.adminMarkNew(pk))
    return res.data
  },

  async deleteMessage(pk: string): Promise<void> {
    await axiosClient.delete(endpoints.contact.adminMessage(pk))
  },
}
