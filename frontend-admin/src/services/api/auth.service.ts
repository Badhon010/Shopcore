import { axiosClient, tokenStorage } from './axiosClient'
import { endpoints } from './endpoints'
import type { User } from '@/types/models'

export interface LoginPayload {
  email: string
  password: string
}

export interface LoginResponse {
  access: string
  refresh: string
  user: User
}

export const authService = {
  login: (payload: LoginPayload) =>
    axiosClient.post<LoginResponse>(endpoints.auth.login(), payload).then((response) => response.data),
  logout: () => {
    const refresh = tokenStorage.getRefreshToken()
    return axiosClient.post(endpoints.auth.logout(), { refresh }).then((response) => response.data)
  },
  me: ({ signal }: { signal?: AbortSignal } = {}) =>
    axiosClient.get<User>(endpoints.auth.me(), { signal }).then((response) => response.data),
}