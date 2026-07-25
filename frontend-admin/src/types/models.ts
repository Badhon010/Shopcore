export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  full_name: string
  phone_number?: string
  date_joined: string
  is_email_verified: boolean
  is_staff: boolean
}