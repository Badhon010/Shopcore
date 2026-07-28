import { axiosClient } from './axiosClient'
import { endpoints } from './endpoints'

type ExportFormat = 'csv' | 'xlsx'

function downloadBlob(data: Blob, filename: string) {
  const url = window.URL.createObjectURL(data)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.URL.revokeObjectURL(url)
}

async function downloadExport(url: string, params: Record<string, unknown>, filename: string) {
  const res = await axiosClient.get(url, {
    params,
    responseType: 'blob',
  })
  downloadBlob(res.data as Blob, filename)
}

export const exportsService = {
  async exportProducts(format: ExportFormat = 'csv', filters?: Record<string, unknown>) {
    await downloadExport(endpoints.exports.products(), { format, ...filters }, `products.${format}`)
  },
  async exportOrders(format: ExportFormat = 'csv', filters?: Record<string, unknown>) {
    await downloadExport(endpoints.exports.orders(), { format, ...filters }, `orders.${format}`)
  },
  async exportCustomers(format: ExportFormat = 'csv', filters?: Record<string, unknown>) {
    await downloadExport(endpoints.exports.customers(), { format, ...filters }, `customers.${format}`)
  },
  async exportSubscribers(format: ExportFormat = 'csv', filters?: Record<string, unknown>) {
    await downloadExport(endpoints.exports.subscribers(), { format, ...filters }, `subscribers.${format}`)
  },
  async exportReviews(format: ExportFormat = 'csv', filters?: Record<string, unknown>) {
    await downloadExport(endpoints.exports.reviews(), { format, ...filters }, `reviews.${format}`)
  },
  async exportInventory(format: ExportFormat = 'csv', filters?: Record<string, unknown>) {
    await downloadExport(endpoints.exports.inventory(), { format, ...filters }, `inventory.${format}`)
  },
}
