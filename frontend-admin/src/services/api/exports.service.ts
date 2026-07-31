import { axiosClient } from './axiosClient'
import { endpoints } from './endpoints'

// Export this type so pages can import it
export type ExportFormat = 'csv' | 'xlsx'

async function fetchBlob(url: string, params: Record<string, unknown>): Promise<Blob> {
  const res = await axiosClient.get(url, {
    params,
    responseType: 'blob',
  })
  return res.data as Blob
}

export const exportsService = {
  async exportProducts(format: ExportFormat = 'csv'): Promise<Blob> {
    return fetchBlob(endpoints.exports.products(), { format })
  },
  async exportOrders(format: ExportFormat = 'csv'): Promise<Blob> {
    return fetchBlob(endpoints.exports.orders(), { format })
  },
  async exportCustomers(format: ExportFormat = 'csv'): Promise<Blob> {
    return fetchBlob(endpoints.exports.customers(), { format })
  },
  async exportSubscribers(format: ExportFormat = 'csv'): Promise<Blob> {
    return fetchBlob(endpoints.exports.subscribers(), { format })
  },
  async exportReviews(format: ExportFormat = 'csv'): Promise<Blob> {
    return fetchBlob(endpoints.exports.reviews(), { format })
  },
  async exportInventory(format: ExportFormat = 'csv'): Promise<Blob> {
    return fetchBlob(endpoints.exports.inventory(), { format })
  },
}
