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
import {
  authService,
  type LoginPayload,
  type RegisterPayload,
} from '@/services/api/auth.service'
import {
  axiosClient,
  setAccessToken,
  tokenStorage,
} from '@/services/api/axiosClient'
import { endpoints } from '@/services/api/endpoints'
import type { User } from '@/types/models'
import { guestCartToken } from '@/services/api/cart.service'
import { cartService } from '@/services/api/cart.service'

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (payload: LoginPayload) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

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
      if (!refreshToken) {
        setIsLoading(false)
        return
      }

      try {
        const { default: axios } = await import('axios')
        const baseURL = import.meta.env.VITE_API_BASE_URL ?? '/api'
        // Type as { access, refresh? } — ROTATE_REFRESH_TOKENS=True means every
        // successful refresh call issues a new refresh token and blacklists the
        // old one. Persist the new token immediately or the next refresh will
        // send a revoked token and log the user out.
        const response = await axios.post<{ access: string; refresh?: string }>(
          `${baseURL}/accounts/token/refresh/`,
          { refresh: refreshToken }
        )
        if (response.data.refresh) {
          tokenStorage.setRefreshToken(response.data.refresh)
        }
        setAccessToken(response.data.access)
        const me = await authService.me()
        setUser(me)
      } catch (err) {
        setAccessToken(null)
        // Only destroy the stored refresh token when the backend definitively
        // rejects it (401 / 400 = blacklisted / malformed).
        // On network errors (no response) keep the token so that the next page
        // load can recover once connectivity is restored.
        const status = (err as { response?: { status?: number } })?.response?.status
        if (status === 401 || status === 400) {
          tokenStorage.clearRefreshToken()
        }
      } finally {
        setIsLoading(false)
      }
    }

    void bootstrap()
  }, [])

  // Listen for session expiry dispatched by axios interceptor
  useEffect(() => {
    const handler = () => {
      setUser(null)
      void queryClient.clear()
    }
    window.addEventListener('auth:session-expired', handler)
    return () => window.removeEventListener('auth:session-expired', handler)
  }, [queryClient])

  const login = useCallback(
    async (payload: LoginPayload) => {
      const data = await authService.login(payload)
      setAccessToken(data.access)
      tokenStorage.setRefreshToken(data.refresh)
      setUser(data.user)

      // The backend has no guest-cart merge endpoint, so the guest cart
      // token is simply discarded — the user's server-side cart (identified
      // by their account) takes over after login.
      guestCartToken.clear()

      await queryClient.invalidateQueries({ queryKey: ['cart'] })
    },
    [queryClient]
  )

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const data = await authService.register(payload)
      setAccessToken(data.access)
      tokenStorage.setRefreshToken(data.refresh)
      setUser(data.user)
    },
    []
  )

  const logout = useCallback(async () => {
    // Read the refresh token BEFORE clearing it — authService.logout() needs
    // to send it to the backend to blacklist it.
    const refresh = tokenStorage.getRefreshToken()

    // Clear local state immediately so the UI responds without waiting for the network.
    setAccessToken(null)
    tokenStorage.clearRefreshToken()
    setUser(null)
    // Remove only auth-scoped cache entries; keep public catalog data so
    // pages don't have to re-fetch after the user logs out.
    queryClient.removeQueries({ queryKey: ['profile'] })
    queryClient.removeQueries({ queryKey: ['auth'] })
    queryClient.removeQueries({ queryKey: ['orders'] })
    queryClient.removeQueries({ queryKey: ['addresses'] })
    queryClient.removeQueries({ queryKey: ['notifications'] })
    queryClient.removeQueries({ queryKey: ['wishlist'] })
    queryClient.removeQueries({ queryKey: ['cart'] })
    // Fire-and-forget: blacklist the refresh token on the backend.
    if (refresh) {
      axiosClient.post(endpoints.auth.logout(), { refresh }).catch(() => undefined)
    }
  }, [queryClient])

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, isLoading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
