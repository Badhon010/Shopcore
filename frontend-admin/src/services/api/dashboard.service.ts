import { axiosClient } from './axiosClient'
import { endpoints } from './endpoints'
import type {
  AnalyticsGranularity,
  BestSellersResponse,
  CouponAnalytics,
  CustomerGrowthAnalytics,
  DashboardOverview,
  InventoryAnalytics,
  NewsletterAnalytics,
  OrderAnalytics,
  RevenueAnalytics,
} from '@/types/models'

/** Query params accepted by the dashboard analytics endpoints. */
export interface AnalyticsParams {
  /** Look-back window in days (default 30). */
  days?: number
  /** Aggregation granularity: day | week | month | year (default day). */
  granularity?: AnalyticsGranularity
  /** Result limit for best-sellers (default 20, max 100). */
  limit?: number
  /** Inclusive start date (YYYY-MM-DD) — overrides `days` for an arbitrary range. */
  date_from?: string
  /** Inclusive end date (YYYY-MM-DD) — overrides `days` for an arbitrary range. */
  date_to?: string
}

export const dashboardService = {
  /** All dashboard KPIs + charts + recent activity in a single request. */
  async getOverview(params?: { days?: number }): Promise<DashboardOverview> {
    const res = await axiosClient.get<DashboardOverview>(endpoints.dashboard.overview(), { params })
    return res.data
  },

  /** Revenue over time, AOV, growth and payment breakdown. */
  async getRevenueAnalytics(params?: AnalyticsParams): Promise<RevenueAnalytics> {
    const res = await axiosClient.get<RevenueAnalytics>(endpoints.dashboard.revenue(), { params })
    return res.data
  },

  /** Orders over time, status distribution and cancellation rate. */
  async getOrderAnalytics(params?: AnalyticsParams): Promise<OrderAnalytics> {
    const res = await axiosClient.get<OrderAnalytics>(endpoints.dashboard.orders(), { params })
    return res.data
  },

  /** Products ranked by units sold and revenue over the period. */
  async getBestSellers(params?: AnalyticsParams): Promise<BestSellersResponse> {
    const res = await axiosClient.get<BestSellersResponse>(endpoints.dashboard.bestSellers(), { params })
    return res.data
  },

  /** New customer registrations over time. */
  async getCustomerGrowth(params?: AnalyticsParams): Promise<CustomerGrowthAnalytics> {
    const res = await axiosClient.get<CustomerGrowthAnalytics>(endpoints.dashboard.customers(), { params })
    return res.data
  },

  /** Inventory value, stock health and warehouse breakdown. */
  async getInventoryAnalytics(): Promise<InventoryAnalytics> {
    const res = await axiosClient.get<InventoryAnalytics>(endpoints.dashboard.inventory())
    return res.data
  },

  /** Coupon usage and discounts in the period. */
  async getCouponAnalytics(params?: AnalyticsParams): Promise<CouponAnalytics> {
    const res = await axiosClient.get<CouponAnalytics>(endpoints.dashboard.coupons(), { params })
    return res.data
  },

  /** Subscriber growth and campaign performance. */
  async getNewsletterAnalytics(params?: AnalyticsParams): Promise<NewsletterAnalytics> {
    const res = await axiosClient.get<NewsletterAnalytics>(endpoints.dashboard.newsletter(), { params })
    return res.data
  },
}
