import { useMutation } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import type { LoginPayload } from '@/services/api/auth.service'

export function useLogin() {
  const { login } = useAuth()
  return useMutation({
    mutationFn: (payload: LoginPayload) => login(payload),
  })
}

export function useRegister() {
  const { register } = useAuth()
  return useMutation({
    mutationFn: (payload: Parameters<typeof register>[0]) => register(payload),
  })
}

export function useLogout() {
  const { logout } = useAuth()
  return useMutation({ mutationFn: () => logout() })
}

export function useCurrentUser() {
  const { user } = useAuth()
  return user
}
