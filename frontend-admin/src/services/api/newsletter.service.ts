import { axiosClient } from './axiosClient'
import { endpoints } from './endpoints'
import type { NewsletterSubscriber } from '@/types/models'
import type { PaginatedResponse } from '@/types/api'

export interface SubscriberListParams {
  page?: number
  page_size?: number
  search?: string
  active?: boolean
}

export const newsletterService = {
  async getSubscribers(params?: SubscriberListParams): Promise<PaginatedResponse<NewsletterSubscriber>> {
    const res = await axiosClient.get<PaginatedResponse<NewsletterSubscriber>>(
      endpoints.newsletter.adminSubscribers(),
      { params }
    )
    return res.data
  },

  async toggleSubscriber(id: number, active: boolean): Promise<NewsletterSubscriber> {
    const res = await axiosClient.patch<NewsletterSubscriber>(
      endpoints.newsletter.adminSubscriber(id),
      { active }
    )
    return res.data
  },

  async deleteSubscriber(id: number): Promise<void> {
    await axiosClient.delete(endpoints.newsletter.adminSubscriber(id))
  },
}
