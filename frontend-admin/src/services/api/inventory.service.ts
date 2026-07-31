import { axiosClient } from './axiosClient'
import { endpoints } from './endpoints'
import type { StockItem, StockMovement, Warehouse } from '@/types/models'
import type { PaginatedResponse, ListParams } from '@/types/api'

export interface StockParams extends ListParams {
  low_stock_only?: boolean
  out_of_stock_only?: boolean
  warehouse?: string
}

export interface AdjustPayload {
  quantity_delta: number
  reason?: string
}

export const inventoryService = {
  async listStock(params?: StockParams): Promise<PaginatedResponse<StockItem>> {
    const res = await axiosClient.get<PaginatedResponse<StockItem>>(
      endpoints.inventory.stockList(), { params }
    )
    return res.data
  },

  async getStockItem(pk: string): Promise<StockItem> {
    const res = await axiosClient.get<StockItem>(endpoints.inventory.stockDetail(pk))
    return res.data
  },

  async restock(pk: string, quantity: number): Promise<StockItem> {
    const res = await axiosClient.post<StockItem>(endpoints.inventory.restock(pk), { quantity })
    return res.data
  },

  async updateThreshold(pk: string, low_stock_threshold: number): Promise<StockItem> {
    const res = await axiosClient.patch<StockItem>(endpoints.inventory.threshold(pk), { low_stock_threshold })
    return res.data
  },

  async adjust(pk: string, payload: AdjustPayload): Promise<StockItem> {
    const res = await axiosClient.post<StockItem>(endpoints.inventory.adjust(pk), payload)
    return res.data
  },

  async getMovements(pk: string, params?: ListParams): Promise<PaginatedResponse<StockMovement>> {
    const res = await axiosClient.get<PaginatedResponse<StockMovement>>(
      endpoints.inventory.movements(pk), { params }
    )
    return res.data
  },

  async listWarehouses(): Promise<Warehouse[]> {
    const res = await axiosClient.get<Warehouse[] | { results: Warehouse[] }>(
      endpoints.inventory.warehouses()
    )
    const data = res.data
    return Array.isArray(data) ? data : (data?.results ?? [])
  },
}
