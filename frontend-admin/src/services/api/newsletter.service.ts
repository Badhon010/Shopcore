import { axiosClient } from './axiosClient'
import { endpoints } from './endpoints'
import type { NewsletterSubscriber, NewsletterCampaign, NewsletterStats } from '@/types/models'
import type { PaginatedResponse, ListParams } from '@/types/api'

export const newsletterService = {
  async listSubscribers(params?: ListParams): Promise<PaginatedResponse<NewsletterSubscriber>> {
    const res = await axiosClient.get<PaginatedResponse<NewsletterSubscriber>>(
      endpoints.newsletter.adminSubscribers(), { params }
    )
    return res.data
  },

  async updateSubscriber(pk: string, data: Partial<NewsletterSubscriber>): Promise<NewsletterSubscriber> {
    const res = await axiosClient.patch<NewsletterSubscriber>(
      endpoints.newsletter.adminSubscriber(pk), data
    )
    return res.data
  },

  async deleteSubscriber(pk: string): Promise<void> {
    await axiosClient.delete(endpoints.newsletter.adminSubscriber(pk))
  },

  async getStats(): Promise<NewsletterStats> {
    const res = await axiosClient.get<NewsletterStats>(endpoints.newsletter.adminStats())
    return res.data
  },

  async listCampaigns(params?: ListParams): Promise<PaginatedResponse<NewsletterCampaign>> {
    const res = await axiosClient.get<PaginatedResponse<NewsletterCampaign>>(
      endpoints.newsletter.adminCampaigns(), { params }
    )
    return res.data
  },

  async getCampaign(pk: string): Promise<NewsletterCampaign> {
    const res = await axiosClient.get<NewsletterCampaign>(endpoints.newsletter.adminCampaign(pk))
    return res.data
  },

  async createCampaign(data: Partial<NewsletterCampaign>): Promise<NewsletterCampaign> {
    const res = await axiosClient.post<NewsletterCampaign>(endpoints.newsletter.adminCampaigns(), data)
    return res.data
  },

  async updateCampaign(pk: string, data: Partial<NewsletterCampaign>): Promise<NewsletterCampaign> {
    const res = await axiosClient.patch<NewsletterCampaign>(endpoints.newsletter.adminCampaign(pk), data)
    return res.data
  },

  async deleteCampaign(pk: string): Promise<void> {
    await axiosClient.delete(endpoints.newsletter.adminCampaign(pk))
  },

  async sendCampaign(pk: string): Promise<void> {
    await axiosClient.post(endpoints.newsletter.adminCampaignSend(pk))
  },

  async duplicateCampaign(pk: string): Promise<NewsletterCampaign> {
    const res = await axiosClient.post<NewsletterCampaign>(endpoints.newsletter.adminCampaignDupe(pk))
    return res.data
  },
}
