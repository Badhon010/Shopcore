import { axiosClient } from './axiosClient'
import { endpoints } from './endpoints'
import type { ApiError } from '@/types/api'

export const newsletterService = {
  async subscribe(email: string): Promise<{ message: string }> {
    const response = await axiosClient.post<{ message: string }>(
      endpoints.newsletter.subscribe(),
      { email }
    )
    return response.data
  },

  isDuplicateEmail(error: ApiError): boolean {
    return (
      error.status === 400 &&
      !!error.fieldErrors?.email?.some((msg) =>
        msg.toLowerCase().includes('already subscribed')
      )
    )
  },
}
