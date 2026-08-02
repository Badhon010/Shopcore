import axios, { AxiosError, type AxiosRequestConfig } from 'axios'
import type { ApiError } from '@/types/api'
import { env } from '@/config/env'

// Access token stored in memory only — never localStorage — to reduce XSS surface.
let accessToken: string | null = null
// Shared refresh promise — deduplicates concurrent 401 retries.
let refreshPromise: Promise<string> | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function getAccessToken(): string | null {
  return accessToken
}

export const axiosClient = axios.create({
  baseURL: env.apiBaseUrl,
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

// --- Response interceptor: 401 refresh + error normalisation ---
axiosClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      if (!refreshPromise) {
        refreshPromise = attemptRefresh()
          .catch((refreshErr) => {
            if (refreshErr instanceof RefreshTokenExpiredError) {
              setAccessToken(null)
              tokenStorage.clearRefreshToken()
              window.dispatchEvent(new CustomEvent('auth:session-expired'))
            }
            throw refreshErr
          })
          .finally(() => {
            refreshPromise = null
          })
      }

      try {
        const newToken = await refreshPromise
        setAccessToken(newToken)
        if (originalRequest.headers) {
          ;(originalRequest.headers as Record<string, string>).Authorization = `Bearer ${newToken}`
        }
        return axiosClient(originalRequest)
      } catch {
        return Promise.reject(normalizeError(error))
      }
    }

    return Promise.reject(normalizeError(error))
  }
)

class RefreshTokenExpiredError extends Error {
  readonly name = 'RefreshTokenExpiredError'
  constructor() {
    super('Refresh token is invalid or has been revoked')
  }
}

async function attemptRefresh(): Promise<string> {
  const refreshToken = tokenStorage.getRefreshToken()
  if (!refreshToken) throw new RefreshTokenExpiredError()

  try {
    const response = await axios.post<{ access: string; refresh?: string }>(
      `${env.apiBaseUrl.replace(/\/+$/, '')}/accounts/token/refresh/`,
      { refresh: refreshToken }
    )
    if (response.data.refresh) {
      tokenStorage.setRefreshToken(response.data.refresh)
    }
    return response.data.access
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status
    if (status === 401 || status === 400) {
      throw new RefreshTokenExpiredError()
    }
    throw err
  }
}

function normalizeError(error: AxiosError): ApiError {
  const status = error.response?.status ?? 0
  const data = error.response?.data as Record<string, unknown> | undefined

  let message = 'An unexpected error occurred'
  let code: string | undefined
  const fieldErrors: Record<string, string[]> = {}

  if (data) {
    // Project-wide error envelope: { error: { code, message, details } }
    const envelope = data['error'] as Record<string, unknown> | undefined
    if (envelope && typeof envelope['message'] === 'string') {
      message = envelope['message']
      if (typeof envelope['code'] === 'string') code = envelope['code']
    } else if (typeof data['detail'] === 'string') {
      message = data['detail']
    } else if (typeof data['message'] === 'string') {
      message = data['message']
    } else if (typeof data['non_field_errors'] === 'object' && Array.isArray(data['non_field_errors'])) {
      message = (data['non_field_errors'] as string[]).join(' ')
    } else if (status === 400) {
      message = 'Please check the form for errors'
    } else if (status === 401) {
      message = 'Authentication required'
    } else if (status === 403) {
      message = 'You do not have permission to perform this action'
    } else if (status === 404) {
      message = 'Resource not found'
    } else if (status >= 500) {
      message = 'Server error. Please try again later.'
    }

    if (typeof data['code'] === 'string') {
      code = data['code']
    }

    // Extract DRF field errors
    for (const [key, value] of Object.entries(data)) {
      if (key !== 'error' && key !== 'detail' && key !== 'message' && key !== 'code' && key !== 'non_field_errors') {
        if (Array.isArray(value)) {
          fieldErrors[key] = value.map(String)
        }
      }
    }
  } else if (error.code === 'ECONNABORTED') {
    message = 'Request timed out. Please try again.'
  } else if (!error.response) {
    message = 'Network error. Please check your connection.'
  }

  return {
    status,
    message,
    code,
    fieldErrors: Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
  }
}

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
