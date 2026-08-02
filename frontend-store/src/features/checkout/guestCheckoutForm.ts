import { z } from 'zod'

// Guest phone matches the backend's GuestCheckoutSerializer validation:
// ^\+?\d{9,15}$ (audit H-4).
const PHONE_RE = /^\+?\d{9,15}$/

/**
 * Guest checkout form schema (audit H-4) — identity + inline shipping
 * address snapshot. Mirrors GuestCheckoutSerializer / GuestAddressSerializer
 * on the backend so client validation matches server validation.
 *
 * The guest's name and phone are captured ONCE and reused for both the
 * order identity (guest_name / guest_phone) and the shipping address
 * snapshot (full_name / phone_number) — standard e-commerce guest UX.
 */
export const guestCheckoutSchema = z.object({
  guest_name: z.string().min(1, 'Full name is required'),
  guest_email: z.string().email('Enter a valid email address'),
  guest_phone: z.string().regex(PHONE_RE, 'Enter a valid phone number (e.g. +8801XXXXXXXXX)'),
  address_line_1: z.string().min(1, 'Address is required'),
  address_line_2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state_province: z.string().min(1, 'State / Province is required'),
  postal_code: z.string().min(1, 'Postal code is required'),
  country: z.string().length(2, 'Enter a 2-letter country code (e.g. BD)'),
})

export type GuestCheckoutFormData = z.infer<typeof guestCheckoutSchema>

/** Build the backend guest checkout payload from the form data. */
export function buildGuestPlaceOrderPayload(
  data: GuestCheckoutFormData
): import('@/services/api/checkout.service').GuestPlaceOrderPayload {
  return {
    guest_name: data.guest_name,
    guest_email: data.guest_email,
    guest_phone: data.guest_phone,
    shipping_address: {
      full_name: data.guest_name,
      phone_number: data.guest_phone,
      address_line_1: data.address_line_1,
      address_line_2: data.address_line_2,
      city: data.city,
      state_province: data.state_province,
      postal_code: data.postal_code,
      country: data.country,
    },
  }
}
