import { axiosClient } from './axiosClient'
import { endpoints } from './endpoints'
import type { Coupon } from '@/types/models'
import type { PaginatedResponse } from '@/types/api'

export interface CouponListParams {
  page?: number
  page_size?: number
  search?: string
  is_active?: boolean
  ordering?: string
}

export type CouponPayload = Omit<Coupon, 'id' | 'times_used'>

export const couponsService = {
  async getCoupons(params?: CouponListParams): Promise<PaginatedResponse<Coupon>> {
    const res = await axiosClient.get<PaginatedResponse<Coupon>>(endpoints.coupons.list(), { params })
    return res.data
  },

  async getCoupon(id: number): Promise<Coupon> {
    const res = await axiosClient.get<Coupon>(endpoints.coupons.detail(id))
    return res.data
  },

  async createCoupon(data: CouponPayload): Promise<Coupon> {
    const res = await axiosClient.post<Coupon>(endpoints.coupons.create(), data)
    return res.data
  },

  async updateCoupon(id: number, data: Partial<CouponPayload>): Promise<Coupon> {
    const res = await axiosClient.patch<Coupon>(endpoints.coupons.detail(id), data)
    return res.data
  },

  async deleteCoupon(id: number): Promise<void> {
    await axiosClient.delete(endpoints.coupons.detail(id))
  },
}
