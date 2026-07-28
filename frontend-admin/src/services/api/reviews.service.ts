import { axiosClient } from './axiosClient'
import { endpoints } from './endpoints'
import type { Review } from '@/types/models'
import type { PaginatedResponse, ListParams } from '@/types/api'

export interface ReviewParams extends ListParams {
  is_approved?: boolean
  min_rating?: number
  max_rating?: number
}

export const reviewsService = {
  async listReviews(params?: ReviewParams): Promise<PaginatedResponse<Review>> {
    const res = await axiosClient.get<PaginatedResponse<Review>>(
      endpoints.reviews.adminList(), { params }
    )
    return res.data
  },

  async getReview(pk: string): Promise<Review> {
    const res = await axiosClient.get<Review>(endpoints.reviews.adminDetail(pk))
    return res.data
  },

  async approveReview(pk: string): Promise<Review> {
    const res = await axiosClient.patch<Review>(endpoints.reviews.adminDetail(pk), { is_approved: true })
    return res.data
  },

  async rejectReview(pk: string): Promise<Review> {
    const res = await axiosClient.patch<Review>(endpoints.reviews.adminDetail(pk), { is_approved: false })
    return res.data
  },

  async deleteReview(pk: string): Promise<void> {
    await axiosClient.delete(endpoints.reviews.adminDetail(pk))
  },
}
