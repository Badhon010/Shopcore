export interface ApiError {
  status: number
  message: string
  code?: string
  fieldErrors?: Record<string, string[]>
}