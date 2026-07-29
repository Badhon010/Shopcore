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
    const res = await axiosClient.get<any>(endpoints.dashboard.revenue(), { params })
    const data = res.data
    const items = Array.isArray(data) ? data : (data?.over_time ?? data?.revenue_chart ?? [])
    return items.map((item: any) => ({
      date: String(item.date ?? item.bucket ?? ''),
      revenue: Number(item.revenue ?? 0),
    }))
  },

  async getOrderVolume(params?: AnalyticsParams): Promise<OrderVolumeDataPoint[]> {
    const res = await axiosClient.get<any>(endpoints.dashboard.orders(), { params })
    const data = res.data
    const items = Array.isArray(data) ? data : (data?.over_time ?? data?.orders_chart ?? [])
    return items.map((item: any) => ({
      date: String(item.date ?? item.bucket ?? ''),
      orders: Number(item.orders ?? 0),
    }))
  },

  async getBestSellers(): Promise<BestSellerItem[]> {
    const res = await axiosClient.get<any>(endpoints.dashboard.bestSellers())
    const data = res.data
    const items = Array.isArray(data) ? data : (data?.results ?? data?.top_products ?? [])
    return items.map((item: any) => ({
      product_name: String(item.product_name ?? ''),
      product_slug: item.product_slug ? String(item.product_slug) : undefined,
      revenue: Number(item.revenue ?? 0),
      units_sold: Number(item.units_sold ?? 0),
    }))
  },

  async getInventoryHealth(): Promise<InventoryHealth> {
    const res = await axiosClient.get<InventoryHealth>(endpoints.dashboard.inventory())
    return res.data
  },
}
