import { axiosClient } from './axiosClient'
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

export interface ChangePasswordPayload {
  old_password: string
  new_password: string
  confirm_password: string
}

export const authService = {
  async login(payload: LoginPayload): Promise<LoginResponse> {
    const res = await axiosClient.post<LoginResponse>(endpoints.auth.login(), payload)
    return res.data
  },

  async logout(refresh: string): Promise<void> {
    await axiosClient.post(endpoints.auth.logout(), { refresh })
  },

  async me(): Promise<User> {
    const res = await axiosClient.get<User>(endpoints.auth.me())
    return res.data
  },

  async changePassword(payload: ChangePasswordPayload): Promise<void> {
    await axiosClient.post(endpoints.auth.changePassword(), payload)
  },
}
