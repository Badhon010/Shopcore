import axios, { AxiosError, type AxiosRequestConfig } from 'axios'
import type { ApiError } from '@/types/api'

// CONTRACT-ASSUMPTION: baseURL points to a DRF backend with JWT auth.
// Update VITE_API_BASE_URL in .env to match your backend.
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

// Access token stored in memory only — never localStorage — to reduce XSS surface.
let accessToken: string | null = null
let refreshPromise: Promise<string | null> | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function getAccessToken(): string | null {
  return accessToken
}

export const axiosClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

// --- Request interceptor: attach Bearer token ---
axiosClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

// --- Response interceptor: 401 refresh + error normalization ---
axiosClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      // Deduplicate concurrent refreshes
      if (!refreshPromise) {
        refreshPromise = attemptRefresh().finally(() => {
          refreshPromise = null
        })
      }

      const newToken = await refreshPromise
      if (newToken) {
        setAccessToken(newToken)
        if (originalRequest.headers) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          ;(originalRequest.headers as Record<string, string>).Authorization = `Bearer ${newToken}`
        }
        return axiosClient(originalRequest)
      }

      // Refresh failed — clear session and redirect
      setAccessToken(null)
      tokenStorage.clearRefreshToken()
      window.dispatchEvent(new CustomEvent('auth:session-expired'))
      return Promise.reject(normalizeError(error))
    }

    return Promise.reject(normalizeError(error))
  }
)

async function attemptRefresh(): Promise<string | null> {
  const refreshToken = tokenStorage.getRefreshToken()
  if (!refreshToken) return null

  try {
    const response = await axios.post<{ access: string }>(`${BASE_URL}/accounts/token/refresh/`, {
      refresh: refreshToken,
    })
    return response.data.access
  } catch {
    return null
  }
}

function normalizeError(error: AxiosError): ApiError {
  if (!error.response) {
    return {
      status: 0,
      message: 'Network error. Please check your connection.',
    }
  }

  const status = error.response.status
  const data = error.response.data as Record<string, unknown>

  // DRF field-level errors: { field_name: ["message"] }
  const fieldErrors: Record<string, string[]> = {}
  let message = 'An error occurred. Please try again.'

  if (typeof data === 'object' && data !== null) {
    for (const [key, value] of Object.entries(data)) {
      if (key === 'detail' && typeof value === 'string') {
        message = value
      } else if (key === 'non_field_errors' && Array.isArray(value)) {
        message = (value as string[]).join(' ')
      } else if (Array.isArray(value)) {
        fieldErrors[key] = value as string[]
      }
    }
  }

  const statusMessages: Record<number, string> = {
    400: 'Please check your input and try again.',
    401: 'Your session has expired. Please log in again.',
    403: 'You do not have permission to perform this action.',
    404: 'The requested resource was not found.',
    429: 'Too many requests. Please wait a moment and try again.',
    500: 'Something went wrong on our end. Please try again later.',
    503: 'Service temporarily unavailable. Please try again later.',
  }

  if (message === 'An error occurred. Please try again.' && statusMessages[status]) {
    message = statusMessages[status] ?? message
  }

  return {
    status,
    message,
    fieldErrors: Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
  }
}

// CONTRACT-ASSUMPTION: Refresh token stored in localStorage as fallback.
// The preferred approach is HttpOnly cookie set by the backend (no JS access needed).
// If backend sets HttpOnly cookie, remove this module's read/write entirely.
// Security trade-off documented: localStorage refresh tokens are vulnerable to XSS
// but more interoperable across same-domain configurations.
export const tokenStorage = {
  getRefreshToken(): string | null {
    try {
      return localStorage.getItem('shopcore-refresh-token')
    } catch {
      return null
    }
  },
  setRefreshToken(token: string): void {
    try {
      localStorage.setItem('shopcore-refresh-token', token)
    } catch {
      console.warn('[Auth] Could not persist refresh token')
    }
  },
  clearRefreshToken(): void {
    try {
      localStorage.removeItem('shopcore-refresh-token')
    } catch {
      // ignore
    }
  },
}

export function applyServerErrors(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setError: (field: any, error: { type: string; message: string }) => void,
  fieldErrors?: Record<string, string[]>
): void {
  if (!fieldErrors) return
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (field !== 'non_field_errors' && field !== 'detail') {
      setError(field, { type: 'server', message: messages.join(' ') })
    }
  }
}
