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
import type { Order } from '@/types/models'

// ---------------------------------------------------------------------------
// Place order
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
// Initiate payment
// ---------------------------------------------------------------------------

export interface InitiatePaymentPayload {
  order_number: string
  /** Payment provider enum value.  Only "MANUAL" is implemented in v1. */
  provider?: string
}

export interface InitiatePaymentResponse {
  payment_id: string | null
  provider: string
  /** Populated for providers that use client-side confirmation (e.g. Stripe). */
  client_secret: string | null
  /** Populated for redirect-based providers. */
  redirect_url: string | null
}

// ---------------------------------------------------------------------------
// Service object
// ---------------------------------------------------------------------------

export const checkoutService = {
  /** Place a new order.  Returns the created Order. */
  placeOrder: (payload: PlaceOrderPayload) =>
    axiosClient
      .post<Order>(endpoints.orders.checkout(), payload)
      .then((r) => r.data),

  /** Initiate payment for an already-placed order. */
  initiatePayment: (payload: InitiatePaymentPayload) =>
    axiosClient
      .post<InitiatePaymentResponse>(endpoints.payments.initiate(), {
        provider: 'MANUAL',
        ...payload,
      })
      .then((r) => r.data),
}
