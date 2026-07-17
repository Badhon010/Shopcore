import { axiosClient } from './axiosClient'
import { endpoints } from './endpoints'
import type { User } from '@/types/models'

export type ProfilePayload = Partial<Pick<User, 'first_name' | 'last_name' | 'phone'>>

export const profileService = {
  getProfile: ({ signal }: { signal?: AbortSignal } = {}) =>
    axiosClient
      .get<User>(endpoints.profile.detail(), { signal })
      .then((r) => r.data),

  updateProfile: (payload: ProfilePayload) =>
    axiosClient
      .patch<User>(endpoints.profile.detail(), payload)
      .then((r) => r.data),

  uploadAvatar: (file: File, onProgress?: (percent: number) => void) => {
    const formData = new FormData()
    formData.append('avatar', file)
    return axiosClient
      .post<User>(endpoints.profile.avatar(), formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          if (onProgress && evt.total) {
            onProgress(Math.round((evt.loaded * 100) / evt.total))
          }
        },
      })
      .then((r) => r.data)
  },
}
