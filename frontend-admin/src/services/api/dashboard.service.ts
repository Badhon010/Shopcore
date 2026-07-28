import { axiosClient } from './axiosClient'
import { endpoints } from './endpoints'
import type { DashboardKPIs, RevenueDataPoint, OrderVolumeDataPoint, BestSellerItem } from '@/types/models'

export interface AnalyticsParams {
  period?: 'day' | 'week' | 'month' | 'year'
}

export interface InventoryHealth {
  total_skus: number
  low_stock_count: number
  out_of_stock_count: number
}

export const dashboardService = {
  async getOverview(): Promise<DashboardKPIs> {
    const res = await axiosClient.get<DashboardKPIs>(endpoints.dashboard.overview())
    return res.data
  },

  async getRevenue(params?: AnalyticsParams): Promise<RevenueDataPoint[]> {
    const res = await axiosClient.get<RevenueDataPoint[]>(endpoints.dashboard.revenue(), { params })
    return res.data
  },

  async getOrderVolume(params?: AnalyticsParams): Promise<OrderVolumeDataPoint[]> {
    const res = await axiosClient.get<OrderVolumeDataPoint[]>(endpoints.dashboard.orders(), { params })
    return res.data
  },

  async getBestSellers(): Promise<BestSellerItem[]> {
    const res = await axiosClient.get<BestSellerItem[]>(endpoints.dashboard.bestSellers())
    return res.data
  },

  async getInventoryHealth(): Promise<InventoryHealth> {
    const res = await axiosClient.get<InventoryHealth>(endpoints.dashboard.inventory())
    return res.data
  },
}
