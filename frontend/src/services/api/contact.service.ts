import { axiosClient } from './axiosClient'
import { endpoints } from './endpoints'

export interface ContactFormPayload {
  name: string
  email: string
  subject: string
  message: string
}

export const contactService = {
  async submit(data: ContactFormPayload): Promise<{ message: string }> {
    const response = await axiosClient.post<{ message: string }>(
      endpoints.contact.submit(),
      data
    )
    return response.data
  },
}
