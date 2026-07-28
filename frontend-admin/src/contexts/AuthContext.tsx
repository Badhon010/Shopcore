import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { authService, type LoginPayload } from '@/services/api/auth.service'
import { axiosClient, setAccessToken, tokenStorage } from '@/services/api/axiosClient'
import { endpoints } from '@/services/api/endpoints'
import type { User } from '@/types/models'

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (payload: LoginPayload) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

// Auth-scoped query keys to remove on logout / session expiry
const AUTH_QUERY_KEYS = [
  ['profile'],
  ['auth'],
  ['notifications'],
  ['current-user'],
]

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const queryClient = useQueryClient()
  const initialized = useRef(false)

  // Bootstrap: attempt silent token refresh on app load
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const bootstrap = async () => {
      const refreshToken = tokenStorage.getRefreshToken()
      if (!refreshToken) { setIsLoading(false); return }

      try {
        const { default: axios } = await import('axios')
        const baseURL = import.meta.env['VITE_API_BASE_URL'] ?? '/api'
        const response = await axios.post<{ access: string; refresh?: string }>(
          `${baseURL}/accounts/token/refresh/`,
          { refresh: refreshToken }
        )
        if (response.data.refresh) tokenStorage.setRefreshToken(response.data.refresh)
        setAccessToken(response.data.access)
        const me = await authService.me()
        setUser(me)
      } catch (err) {
        setAccessToken(null)
        const status = (err as { response?: { status?: number } })?.response?.status
        if (status === 401 || status === 400) tokenStorage.clearRefreshToken()
      } finally {
        setIsLoading(false)
      }
    }

    void bootstrap()
  }, [])

  // Listen for session expiry from axios interceptor
  useEffect(() => {
    const handler = () => {
      setUser(null)
      AUTH_QUERY_KEYS.forEach((key) => queryClient.removeQueries({ queryKey: key }))
    }
    window.addEventListener('auth:session-expired', handler)
    return () => window.removeEventListener('auth:session-expired', handler)
  }, [queryClient])

  const login = useCallback(async (payload: LoginPayload) => {
    const data = await authService.login(payload)
    setAccessToken(data.access)
    tokenStorage.setRefreshToken(data.refresh)
    setUser(data.user)
  }, [])

  const logout = useCallback(() => {
    const refresh = tokenStorage.getRefreshToken()
    setAccessToken(null)
    tokenStorage.clearRefreshToken()
    setUser(null)
    AUTH_QUERY_KEYS.forEach((key) => queryClient.removeQueries({ queryKey: key }))
    if (refresh) {
      axiosClient.post(endpoints.auth.logout(), { refresh }).catch(() => undefined)
    }
  }, [queryClient])

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
