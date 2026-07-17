import { axiosClient } from './axiosClient'
import { endpoints } from './endpoints'
import type { CheckoutSession, Order, ShippingMethod } from '@/types/models'
import type { Address } from '@/types/models'

export interface CheckoutSessionPayload {
  shipping_address?: Omit<Address, 'id' | 'is_default'> | { id: string }
  billing_address?: Omit<Address, 'id' | 'is_default'> | { id: string }
  shipping_method_id?: string
  same_as_shipping?: boolean
}

export interface PlaceOrderPayload {
  shipping_address: Omit<Address, 'id' | 'is_default'> | { id: string }
  billing_address: Omit<Address, 'id' | 'is_default'> | { id: string }
  shipping_method_id: string
  payment_method_id?: string
  terms_accepted: boolean
}

export interface PaymentIntentResponse {
  client_secret: string
  payment_intent_id: string
}

export const checkoutService = {
  getSession: ({ signal }: { signal?: AbortSignal } = {}) =>
    axiosClient
      .get<CheckoutSession>(endpoints.checkout.session(), { signal })
      .then((r) => r.data),

  updateSession: (payload: CheckoutSessionPayload) =>
    axiosClient
      .patch<CheckoutSession>(endpoints.checkout.session(), payload)
      .then((r) => r.data),

  getShippingMethods: ({ signal }: { signal?: AbortSignal } = {}) =>
    axiosClient
      .get<ShippingMethod[]>(endpoints.checkout.shippingMethods(), { signal })
      .then((r) => r.data),

  createPaymentIntent: () =>
    axiosClient
      .post<PaymentIntentResponse>(endpoints.checkout.paymentIntent())
      .then((r) => r.data),

  placeOrder: (payload: PlaceOrderPayload) =>
    axiosClient
      .post<Order>(endpoints.checkout.placeOrder(), payload)
      .then((r) => r.data),
}
