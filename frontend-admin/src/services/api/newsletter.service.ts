import { axiosClient } from './axiosClient'
import { endpoints } from './endpoints'
import type { NewsletterSubscriber, NewsletterCampaign, NewsletterStats } from '@/types/models'
import type { PaginatedResponse } from '@/types/api'

export interface SubscriberListParams {
  page?: number
  page_size?: number
  search?: string
  active?: boolean
}

export interface CampaignListParams {
  page?: number
  page_size?: number
  search?: string
  status?: string
}

export interface CreateCampaignPayload {
  title: string
  subject: string
  preview_text?: string
  html_body: string
  plain_body?: string
}

export const newsletterService = {
  // ── Subscribers ───────────────────────────────────────────────────────────
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

  // ── Stats ─────────────────────────────────────────────────────────────────
  async getStats(): Promise<NewsletterStats> {
    const res = await axiosClient.get<NewsletterStats>(endpoints.newsletter.adminStats())
    return res.data
  },

  // ── Campaigns ─────────────────────────────────────────────────────────────
  async getCampaigns(params?: CampaignListParams): Promise<PaginatedResponse<NewsletterCampaign>> {
    const res = await axiosClient.get<PaginatedResponse<NewsletterCampaign>>(
      endpoints.newsletter.adminCampaigns(),
      { params }
    )
    return res.data
  },

  async getCampaign(id: number): Promise<NewsletterCampaign> {
    const res = await axiosClient.get<NewsletterCampaign>(endpoints.newsletter.adminCampaign(id))
    return res.data
  },

  async createCampaign(data: CreateCampaignPayload): Promise<NewsletterCampaign> {
    const res = await axiosClient.post<NewsletterCampaign>(
      endpoints.newsletter.adminCampaigns(),
      data
    )
    return res.data
  },

  async updateCampaign(id: number, data: Partial<CreateCampaignPayload>): Promise<NewsletterCampaign> {
    const res = await axiosClient.patch<NewsletterCampaign>(
      endpoints.newsletter.adminCampaign(id),
      data
    )
    return res.data
  },

  async deleteCampaign(id: number): Promise<void> {
    await axiosClient.delete(endpoints.newsletter.adminCampaign(id))
  },

  async sendCampaign(id: number): Promise<NewsletterCampaign> {
    const res = await axiosClient.post<NewsletterCampaign>(endpoints.newsletter.sendCampaign(id))
    return res.data
  },

  async duplicateCampaign(id: number): Promise<NewsletterCampaign> {
    const res = await axiosClient.post<NewsletterCampaign>(endpoints.newsletter.duplicateCampaign(id))
    return res.data
  },
}
