export interface ApiError {
  status: number
  message: string
  code?: string
  fieldErrors?: Record<string, string[]>
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}
