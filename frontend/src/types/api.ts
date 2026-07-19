export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface CursorPaginatedResponse<T> {
  next: string | null
  previous: string | null
  results: T[]
}

export interface ApiError {
  status: number
  message: string
  fieldErrors?: Record<string, string[]>
}

export interface ApiSuccessResponse<T> {
  data: T
  message?: string
}

export type SortOrder = 'asc' | 'desc'

export interface ListParams {
  page?: number
  page_size?: number
  ordering?: string
  search?: string
  [key: string]: unknown
}
