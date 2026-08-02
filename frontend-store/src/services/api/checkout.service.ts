/**
 * Checkout service — wraps the two real backend endpoints that drive the
 * checkout flow:
 *
 *   POST /orders/checkout/      → place a new order
 *   POST /payments/initiate/    → trigger payment on a placed order
 *
 * There is no server-managed checkout session. Address selection and
 * cart state are read directly from their own endpoints
 * (GET /accounts/addresses/ and GET /cart/) and the selected address ID
 * is carried between checkout steps via React Router navigation state.
 */
import { axiosClient } from './axiosClient'
import { endpoints } from './endpoints'
import { guestCartToken } from './cart.service'
import type { Order, PaymentProvider } from '@/types/models'

// ---------------------------------------------------------------------------
// Place order (registered user)
// ---------------------------------------------------------------------------

export interface PlaceOrderPayload {
  /** PK of a saved Address belonging to the current user. */
  shipping_address_id: number
  /** Defaults to shipping_address_id when omitted. */
  billing_address_id?: number
  coupon_code?: string
  notes?: string
  /** Idempotency key to prevent duplicate orders on retry. */
  idempotency_key?: string
}

// ---------------------------------------------------------------------------
// Place order (guest) — audit H-4
// ---------------------------------------------------------------------------

/**
 * Guest checkout replaces the saved-Address FKs with inline identity + a
 * shipping-address snapshot. The X-Cart-Token header is sent automatically
 * by the axios client helpers below — the backend uses it to resolve the
 * guest cart (Cart.session_key) and to attach guest_session_id.
 */
export interface GuestAddressPayload {
  full_name: string
  phone_number: string
  address_line_1: string
  address_line_2?: string
  city: string
  state_province: string
  postal_code: string
  country: string
}

export interface GuestPlaceOrderPayload {
  guest_name: string
  guest_email: string
  guest_phone: string
  shipping_address: GuestAddressPayload
  coupon_code?: string
  notes?: string
  idempotency_key?: string
}

// ---------------------------------------------------------------------------
// Initiate payment
// ---------------------------------------------------------------------------

export interface InitiatePaymentPayload {
  order_number: string
  /** Payment provider enum value (defaults to MANUAL / COD). */
  provider?: PaymentProvider
}

export interface InitiatePaymentResponse {
  payment_id: string | null
  provider: string
  /** Populated for providers that use client-side confirmation (e.g. Stripe). */
  client_secret: string | null
  /** Populated for redirect-based providers (SSLCommerz / PayPal). */
  redirect_url: string | null
}

// ---------------------------------------------------------------------------
// Service object
// ---------------------------------------------------------------------------

function cartHeaders(): Record<string, string> {
  const token = guestCartToken.get()
  return token ? { 'X-Cart-Token': token } : {}
}

export const checkoutService = {
  /** Place a new order (registered user).  Returns the created Order. */
  placeOrder: (payload: PlaceOrderPayload) =>
    axiosClient
      .post<Order>(endpoints.orders.checkout(), payload)
      .then((r) => r.data),

  /** Place a new order as a guest (audit H-4). Returns the created Order
   *  including the one-time `guest_lookup_token` (the DB stores only its hash). */
  placeGuestOrder: (payload: GuestPlaceOrderPayload) =>
    axiosClient
      .post<Order>(endpoints.orders.checkout(), payload, { headers: cartHeaders() })
      .then((r) => r.data),

  /** Initiate payment for an already-placed order. */
  initiatePayment: (payload: InitiatePaymentPayload) =>
    axiosClient
      .post<InitiatePaymentResponse>(endpoints.payments.initiate(), payload)
      .then((r) => r.data),
}
