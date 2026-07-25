import { axiosClient } from './axiosClient'
import { endpoints } from './endpoints'
import type { StockItem } from '@/types/models'
import type { PaginatedResponse } from '@/types/api'

export interface StockListParams {
  page?: number
  page_size?: number
  search?: string
  is_low_stock?: boolean
}

export const inventoryService = {
  async getStock(params?: StockListParams): Promise<PaginatedResponse<StockItem>> {
    const res = await axiosClient.get<PaginatedResponse<StockItem>>(endpoints.inventory.stock(), { params })
    return res.data
  },

  async getStockItem(id: number): Promise<StockItem> {
    const res = await axiosClient.get<StockItem>(endpoints.inventory.stockItem(id))
    return res.data
  },

  async restock(id: number, quantity: number, reference?: string, note?: string): Promise<StockItem> {
    const res = await axiosClient.post<StockItem>(endpoints.inventory.restock(id), { quantity, reference, note })
    return res.data
  },
}
