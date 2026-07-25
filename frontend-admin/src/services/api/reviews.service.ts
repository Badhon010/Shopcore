import { axiosClient } from './axiosClient'
import { endpoints } from './endpoints'
import type { Review } from '@/types/models'
import type { PaginatedResponse } from '@/types/api'

export interface ReviewListParams {
  page?: number
  page_size?: number
  search?: string
  is_approved?: boolean
  rating?: number
  ordering?: string
}

export const reviewsService = {
  async getReviews(params?: ReviewListParams): Promise<PaginatedResponse<Review>> {
    const res = await axiosClient.get<PaginatedResponse<Review>>(endpoints.reviews.adminList(), { params })
    return res.data
  },

  async approveReview(id: number): Promise<Review> {
    const res = await axiosClient.patch<Review>(endpoints.reviews.adminDetail(id), { is_approved: true })
    return res.data
  },

  async rejectReview(id: number): Promise<Review> {
    const res = await axiosClient.patch<Review>(endpoints.reviews.adminDetail(id), { is_approved: false })
    return res.data
  },

  async deleteReview(id: number): Promise<void> {
    await axiosClient.delete(endpoints.reviews.adminDetail(id))
  },
}
