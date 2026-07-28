import { axiosClient } from './axiosClient'
import { endpoints } from './endpoints'
import type { Coupon } from '@/types/models'
import type { PaginatedResponse, ListParams } from '@/types/api'

export const couponsService = {
  async listCoupons(params?: ListParams): Promise<PaginatedResponse<Coupon>> {
    const res = await axiosClient.get<PaginatedResponse<Coupon>>(
      endpoints.coupons.list(), { params }
    )
    return res.data
  },

  async getCoupon(pk: string): Promise<Coupon> {
    const res = await axiosClient.get<Coupon>(endpoints.coupons.detail(pk))
    return res.data
  },

  async createCoupon(data: Partial<Coupon>): Promise<Coupon> {
    const res = await axiosClient.post<Coupon>(endpoints.coupons.list(), data)
    return res.data
  },

  async updateCoupon(pk: string, data: Partial<Coupon>): Promise<Coupon> {
    const res = await axiosClient.patch<Coupon>(endpoints.coupons.detail(pk), data)
    return res.data
  },

  async deleteCoupon(pk: string): Promise<void> {
    await axiosClient.delete(endpoints.coupons.detail(pk))
  },
}
