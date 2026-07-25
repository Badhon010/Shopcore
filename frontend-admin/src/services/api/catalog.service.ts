import { axiosClient } from './axiosClient'
import { endpoints } from './endpoints'
import type { Brand, Category, Product } from '@/types/models'
import type { PaginatedResponse } from '@/types/api'

export interface ProductListParams {
  page?: number
  page_size?: number
  search?: string
  category?: number
  brand?: number
  status?: string
  is_featured?: boolean
  ordering?: string
}

export const catalogService = {
  // Products
  async getProducts(params?: ProductListParams): Promise<PaginatedResponse<Product>> {
    const res = await axiosClient.get<PaginatedResponse<Product>>(endpoints.catalog.products(), { params })
    return res.data
  },

  async getProduct(slug: string): Promise<Product> {
    const res = await axiosClient.get<Product>(endpoints.catalog.product(slug))
    return res.data
  },

  async createProduct(data: Partial<Product>): Promise<Product> {
    const res = await axiosClient.post<Product>(endpoints.catalog.products(), data)
    return res.data
  },

  async updateProduct(slug: string, data: Partial<Product>): Promise<Product> {
    const res = await axiosClient.patch<Product>(endpoints.catalog.product(slug), data)
    return res.data
  },

  async deleteProduct(slug: string): Promise<void> {
    await axiosClient.delete(endpoints.catalog.product(slug))
  },

  // Categories
  async getCategories(params?: { page?: number; page_size?: number; search?: string }): Promise<PaginatedResponse<Category>> {
    const res = await axiosClient.get<PaginatedResponse<Category>>(endpoints.catalog.categories(), { params })
    return res.data
  },

  async getCategoryTree(): Promise<Category[]> {
    const res = await axiosClient.get<Category[]>(endpoints.catalog.categoryTree())
    return res.data
  },

  async getCategory(id: number): Promise<Category> {
    const res = await axiosClient.get<Category>(endpoints.catalog.category(id))
    return res.data
  },

  async createCategory(data: Partial<Category>): Promise<Category> {
    const res = await axiosClient.post<Category>(endpoints.catalog.categories(), data)
    return res.data
  },

  async updateCategory(id: number, data: Partial<Category>): Promise<Category> {
    const res = await axiosClient.patch<Category>(endpoints.catalog.category(id), data)
    return res.data
  },

  async deleteCategory(id: number): Promise<void> {
    await axiosClient.delete(endpoints.catalog.category(id))
  },

  // Brands
  async getBrands(params?: { page?: number; page_size?: number; search?: string }): Promise<PaginatedResponse<Brand>> {
    const res = await axiosClient.get<PaginatedResponse<Brand>>(endpoints.catalog.brands(), { params })
    return res.data
  },

  async getBrand(id: number): Promise<Brand> {
    const res = await axiosClient.get<Brand>(endpoints.catalog.brand(id))
    return res.data
  },

  async createBrand(data: Partial<Brand>): Promise<Brand> {
    const res = await axiosClient.post<Brand>(endpoints.catalog.brands(), data)
    return res.data
  },

  async updateBrand(id: number, data: Partial<Brand>): Promise<Brand> {
    const res = await axiosClient.patch<Brand>(endpoints.catalog.brand(id), data)
    return res.data
  },

  async deleteBrand(id: number): Promise<void> {
    await axiosClient.delete(endpoints.catalog.brand(id))
  },
}
