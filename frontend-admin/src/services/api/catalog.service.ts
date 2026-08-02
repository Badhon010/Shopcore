import { axiosClient } from './axiosClient'
import { endpoints } from './endpoints'
import type { AdminProduct, Category, Brand, Banner, ProductVariant, ProductImage, Attribute } from '@/types/models'
import type { PaginatedResponse, ListParams } from '@/types/api'

export interface AdminProductParams extends ListParams {
  status?: string
  category?: string
  brand?: string
}

export interface ProductVariantPayload {
  sku: string
  price_override?: string | null
  is_active?: boolean
  attribute_values?: number[]
}

export const catalogService = {
  // ── Products ────────────────────────────────────────────
  async listProducts(params?: AdminProductParams): Promise<PaginatedResponse<AdminProduct>> {
    const res = await axiosClient.get<PaginatedResponse<AdminProduct>>(
      endpoints.catalog.adminProducts(), { params }
    )
    return res.data
  },

  async getProduct(slug: string): Promise<AdminProduct> {
    const res = await axiosClient.get<AdminProduct>(endpoints.catalog.adminProduct(slug))
    return res.data
  },

  async createProduct(data: FormData | Partial<AdminProduct>): Promise<AdminProduct> {
    const res = await axiosClient.post<AdminProduct>(endpoints.catalog.adminProducts(), data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
    })
    return res.data
  },

  async updateProduct(slug: string, data: Partial<AdminProduct>): Promise<AdminProduct> {
    const res = await axiosClient.patch<AdminProduct>(endpoints.catalog.adminProduct(slug), data)
    return res.data
  },

  async deleteProduct(slug: string): Promise<void> {
    await axiosClient.delete(endpoints.catalog.adminProduct(slug))
  },

  // ── Variants ────────────────────────────────────────────
  async listVariants(productSlug: string): Promise<ProductVariant[]> {
    const res = await axiosClient.get<ProductVariant[] | { results: ProductVariant[] }>(
      endpoints.catalog.adminVariants(productSlug)
    )
    // Handle both flat array (pagination_class = None) and paginated envelope
    const data = res.data
    return Array.isArray(data) ? data : (data?.results ?? [])
  },

  async createVariant(productSlug: string, data: ProductVariantPayload): Promise<ProductVariant> {
    const res = await axiosClient.post<ProductVariant>(endpoints.catalog.adminVariants(productSlug), data)
    return res.data
  },

  async updateVariant(productSlug: string, pk: string, data: ProductVariantPayload): Promise<ProductVariant> {
    const res = await axiosClient.patch<ProductVariant>(endpoints.catalog.adminVariant(productSlug, pk), data)
    return res.data
  },

  async deleteVariant(productSlug: string, pk: string): Promise<void> {
    await axiosClient.delete(endpoints.catalog.adminVariant(productSlug, pk))
  },

  // ── Images ──────────────────────────────────────────────
  async listImages(productSlug: string): Promise<ProductImage[]> {
    const res = await axiosClient.get<ProductImage[] | { results: ProductImage[] }>(
      endpoints.catalog.adminImages(productSlug)
    )
    // Handle both flat array (pagination_class = None) and paginated envelope
    const data = res.data
    return Array.isArray(data) ? data : (data?.results ?? [])
  },

  async uploadImage(productSlug: string, data: FormData): Promise<ProductImage> {
    const res = await axiosClient.post<ProductImage>(endpoints.catalog.adminImages(productSlug), data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  },

  async updateImage(productSlug: string, pk: string, data: Partial<ProductImage>): Promise<ProductImage> {
    const res = await axiosClient.patch<ProductImage>(endpoints.catalog.adminImage(productSlug, pk), data)
    return res.data
  },

  async deleteImage(productSlug: string, pk: string): Promise<void> {
    await axiosClient.delete(endpoints.catalog.adminImage(productSlug, pk))
  },

  // ── Categories ──────────────────────────────────────────
  async listCategories(params?: ListParams): Promise<PaginatedResponse<Category>> {
    const res = await axiosClient.get<PaginatedResponse<Category>>(
      endpoints.catalog.adminCategories(), { params }
    )
    return res.data
  },

  async getCategory(pk: string): Promise<Category> {
    const res = await axiosClient.get<Category>(endpoints.catalog.adminCategory(pk))
    return res.data
  },

  async createCategory(data: FormData | Partial<Category>): Promise<Category> {
    const res = await axiosClient.post<Category>(endpoints.catalog.adminCategories(), data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
    })
    return res.data
  },

  async updateCategory(pk: string, data: FormData | Partial<Category>): Promise<Category> {
    const res = await axiosClient.patch<Category>(endpoints.catalog.adminCategory(pk), data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
    })
    return res.data
  },

  async deleteCategory(pk: string): Promise<void> {
    await axiosClient.delete(endpoints.catalog.adminCategory(pk))
  },

  // ── Brands ──────────────────────────────────────────────
  async listBrands(params?: ListParams): Promise<PaginatedResponse<Brand>> {
    const res = await axiosClient.get<PaginatedResponse<Brand>>(
      endpoints.catalog.adminBrands(), { params }
    )
    return res.data
  },

  async getBrand(pk: string): Promise<Brand> {
    const res = await axiosClient.get<Brand>(endpoints.catalog.adminBrand(pk))
    return res.data
  },

  async createBrand(data: FormData | Partial<Brand>): Promise<Brand> {
    const res = await axiosClient.post<Brand>(endpoints.catalog.adminBrands(), data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
    })
    return res.data
  },

  async updateBrand(pk: string, data: FormData | Partial<Brand>): Promise<Brand> {
    const res = await axiosClient.patch<Brand>(endpoints.catalog.adminBrand(pk), data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
    })
    return res.data
  },

  async deleteBrand(pk: string): Promise<void> {
    await axiosClient.delete(endpoints.catalog.adminBrand(pk))
  },

  // ── Banners ─────────────────────────────────────────────
  async listBanners(params?: ListParams): Promise<PaginatedResponse<Banner>> {
    const res = await axiosClient.get<PaginatedResponse<Banner>>(
      endpoints.catalog.adminBanners(), { params }
    )
    return res.data
  },

  async createBanner(data: FormData): Promise<Banner> {
    const res = await axiosClient.post<Banner>(endpoints.catalog.adminBanners(), data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  },

  async updateBanner(pk: string, data: Partial<Banner> | FormData): Promise<Banner> {
    const res = await axiosClient.patch<Banner>(endpoints.catalog.adminBanner(pk), data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
    })
    return res.data
  },

  async deleteBanner(pk: string): Promise<void> {
    await axiosClient.delete(endpoints.catalog.adminBanner(pk))
  },

  // ── Attributes ──────────────────────────────────────────
  async listAttributes(): Promise<Attribute[]> {
    const res = await axiosClient.get<Attribute[] | { results: Attribute[] }>(
      endpoints.catalog.adminAttributes()
    )
    const data = res.data
    return Array.isArray(data) ? data : (data?.results ?? [])
  },
}
