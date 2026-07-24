import { useAuth } from '@/contexts/AuthContext'

/**
 * Returns `true` only when the user is fully authenticated AND the auth
 * bootstrap has completed.
 *
 * Use this as the `enabled` prop on every `useQuery` / `useInfiniteQuery`
 * that calls an authenticated endpoint. It prevents two failure modes:
 *
 * 1. **Bootstrap race** — without `!isLoading`, a hook can fire an
 *    unauthenticated request while the silent token-refresh is still
 *    in-flight. That 401 triggers the response interceptor, which calls
 *    `attemptRefresh()` concurrently with the bootstrap. Both send the
 *    same refresh token; the backend blacklists it on first use, and the
 *    slower caller gets a 401-on-blacklisted-token, clearing the session.
 *
 * 2. **Post-logout refetch** — without `isAuthenticated`, a hook whose
 *    cache entry was just removed by `logout()` will immediately re-fetch
 *    (React Query re-subscribes active observers). With no tokens, the
 *    request gets a 401, the interceptor finds no refresh token, and
 *    dispatches `auth:session-expired`, which wipes catalog cache.
 */
export function useAuthEnabled(): boolean {
  const { isAuthenticated, isLoading } = useAuth()
  return isAuthenticated && !isLoading
}
