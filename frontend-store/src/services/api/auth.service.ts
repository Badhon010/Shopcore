// Several auth endpoints return untyped response bodies (204 / minimal JSON).
// The no-unsafe-return rule is suppressed here until those endpoints receive
// explicit response-type parameters. Track as a follow-up typing task.
/* eslint-disable @typescript-eslint/no-unsafe-return */
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

export interface RegisterPayload {
  email: string
  password: string
  password_confirm: string
  first_name: string
  last_name: string
}

export interface ForgotPasswordPayload {
  email: string
}

export interface ResetPasswordPayload {
  uid: string
  token: string
  new_password: string
  new_password_confirm: string
}

export interface VerifyEmailPayload {
  uid: string
  token: string
}

export interface ChangePasswordPayload {
  old_password: string
  new_password: string
  new_password_confirm: string
}

export interface DeleteAccountPayload {
  password: string
  confirmation: string
}

export const authService = {
  login: (payload: LoginPayload) =>
    axiosClient.post<LoginResponse>(endpoints.auth.login(), payload).then((r) => r.data),

  register: (payload: RegisterPayload) =>
    axiosClient.post<User>(endpoints.auth.register(), payload).then((r) => r.data),

  resendVerification: (payload: { email: string }) =>
    axiosClient.post(endpoints.auth.resendVerification(), payload).then((r) => r.data),

  logout: () => {
    // LogoutView requires the refresh token in the body to blacklist it.
    // Without it the backend returns 400 and the token is never revoked.
    const refresh = tokenStorage.getRefreshToken()
    return axiosClient.post(endpoints.auth.logout(), { refresh }).then((r) => r.data)
  },

  me: ({ signal }: { signal?: AbortSignal } = {}) =>
    axiosClient.get<User>(endpoints.auth.me(), { signal }).then((r) => r.data),

  forgotPassword: (payload: ForgotPasswordPayload) =>
    axiosClient.post(endpoints.auth.forgotPassword(), payload).then((r) => r.data),

  resetPassword: (payload: ResetPasswordPayload) =>
    axiosClient.post(endpoints.auth.resetPassword(), payload).then((r) => r.data),

  verifyEmail: (payload: VerifyEmailPayload) =>
    axiosClient.post(endpoints.auth.verifyEmail(), payload).then((r) => r.data),

  changePassword: (payload: ChangePasswordPayload) =>
    axiosClient.post(endpoints.auth.changePassword(), payload).then((r) => r.data),

  deleteAccount: (payload: DeleteAccountPayload) =>
    axiosClient.post(endpoints.auth.deleteAccount(), payload).then((r) => r.data),
}
