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
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const AUTH_QUERY_KEYS = [['auth'], ['current-user']]

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const initialized = useRef(false)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const bootstrap = async () => {
      const refreshToken = tokenStorage.getRefreshToken()
      if (!refreshToken) {
        setIsLoading(false)
        return
      }

      try {
        const response = await axiosClient.post<{ access: string; refresh?: string }>(
          endpoints.auth.refresh(),
          { refresh: refreshToken }
        )
        if (response.data.refresh) tokenStorage.setRefreshToken(response.data.refresh)
        setAccessToken(response.data.access)
        setUser(await authService.me())
      } catch {
        setAccessToken(null)
        // The interceptor handles definitive refresh failures and clears storage.
      } finally {
        setIsLoading(false)
      }
    }

    void bootstrap()
  }, [])

  useEffect(() => {
    const handleSessionExpired = () => {
      setAccessToken(null)
      setUser(null)
      AUTH_QUERY_KEYS.forEach((queryKey) => queryClient.removeQueries({ queryKey }))
    }
    window.addEventListener('auth:session-expired', handleSessionExpired)
    return () => window.removeEventListener('auth:session-expired', handleSessionExpired)
  }, [queryClient])

  const login = useCallback(async (payload: LoginPayload) => {
    const data = await authService.login(payload)
    setAccessToken(data.access)
    tokenStorage.setRefreshToken(data.refresh)
    setUser(data.user)
  }, [])

  const logout = useCallback(async () => {
    const refresh = tokenStorage.getRefreshToken()
    setAccessToken(null)
    tokenStorage.clearRefreshToken()
    setUser(null)
    AUTH_QUERY_KEYS.forEach((queryKey) => queryClient.removeQueries({ queryKey }))

    if (refresh) {
      await axiosClient.post(endpoints.auth.logout(), { refresh }).catch(() => undefined)
    }
  }, [queryClient])

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}