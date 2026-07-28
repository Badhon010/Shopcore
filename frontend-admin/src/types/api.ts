export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface ApiError {
  status: number
  message: string
  code?: string
  fieldErrors?: Record<string, string[]>
}

export interface ListParams {
  page?: number
  page_size?: number
  ordering?: string
  search?: string
  [key: string]: unknown
}
