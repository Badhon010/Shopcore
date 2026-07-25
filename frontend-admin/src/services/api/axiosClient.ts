import axios, { AxiosError, type AxiosRequestConfig } from 'axios'
import type { ApiError } from '@/types/api'
import { env } from '@/config/env'
import { endpoints } from './endpoints'

let accessToken: string | null = null
let refreshPromise: Promise<string> | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function getAccessToken() {
  return accessToken
}

export const tokenStorage = {
  getRefreshToken(): string | null {
    try {
      return localStorage.getItem('shopcore-refresh-token')
    } catch {
      return null
    }
  },
  setRefreshToken(token: string) {
    try {
      localStorage.setItem('shopcore-refresh-token', token)
    } catch {
      console.warn('[AdminAuth] Could not persist refresh token')
    }
  },
  clearRefreshToken() {
    try {
      localStorage.removeItem('shopcore-refresh-token')
    } catch {
      // Storage can be unavailable in privacy-restricted browsers.
    }
  },
}

export const axiosClient = axios.create({
  baseURL: env.apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

axiosClient.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})

axiosClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true
      if (!refreshPromise) {
        refreshPromise = attemptRefresh()
          .catch((refreshError) => {
            if (refreshError instanceof RefreshTokenExpiredError) {
              setAccessToken(null)
              tokenStorage.clearRefreshToken()
              window.dispatchEvent(new CustomEvent('auth:session-expired'))
            }
            throw refreshError
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
}

async function attemptRefresh(): Promise<string> {
  const refreshToken = tokenStorage.getRefreshToken()
  if (!refreshToken) throw new RefreshTokenExpiredError('Refresh token is missing')

  try {
    const response = await axios.post<{ access: string; refresh?: string }>(
      `${env.apiBaseUrl}${endpoints.auth.refresh()}`,
      { refresh: refreshToken }
    )
    if (response.data.refresh) tokenStorage.setRefreshToken(response.data.refresh)
    return response.data.access
  } catch (error) {
    const status = (error as AxiosError).response?.status
    if (status === 400 || status === 401) {
      throw new RefreshTokenExpiredError('Refresh token is invalid')
    }
    throw error
  }
}

function normalizeError(error: AxiosError): ApiError {
  if (!error.response) {
    return { status: 0, message: 'Network error. Please check your connection.' }
  }

  const status = error.response.status
  const data = error.response.data as Record<string, unknown>
  const fieldErrors: Record<string, string[]> = {}
  let message = 'An error occurred. Please try again.'
  let code: string | undefined

  if (typeof data === 'object' && data !== null) {
    const errorEnvelope = data.error
    if (typeof errorEnvelope === 'object' && errorEnvelope !== null) {
      const envelope = errorEnvelope as Record<string, unknown>
      if (typeof envelope.message === 'string') message = envelope.message
      if (typeof envelope.code === 'string') code = envelope.code
    }
    for (const [key, value] of Object.entries(data)) {
      if (key === 'detail' && typeof value === 'string') message = value
      else if (key === 'code' && typeof value === 'string') code = value
      else if (key === 'non_field_errors' && Array.isArray(value)) message = value.join(' ')
      else if (Array.isArray(value)) fieldErrors[key] = value.filter((item): item is string => typeof item === 'string')
    }
  }

  const statusMessages: Record<number, string> = {
    400: 'Please check your input and try again.',
    401: 'Your session has expired. Please sign in again.',
    403: 'You do not have permission to perform this action.',
    429: 'Too many requests. Please wait a moment and try again.',
    500: 'Something went wrong on our end. Please try again later.',
    503: 'Service temporarily unavailable. Please try again later.',
  }
  if (message === 'An error occurred. Please try again.' && statusMessages[status]) {
    message = statusMessages[status]
  }

  return {
    status,
    message,
    code,
    fieldErrors: Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
  }
}

export function applyServerErrors(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setError: (field: any, error: { type: string; message: string }) => void,
  fieldErrors?: Record<string, string[]>
) {
  if (!fieldErrors) return
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (field !== 'non_field_errors' && field !== 'detail') {
      setError(field, { type: 'server', message: messages.join(' ') })
    }
  }
}