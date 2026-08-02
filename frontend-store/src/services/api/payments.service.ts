/**
 * Payments service — wraps the storefront payment endpoints:
 *
 *   GET  /payments/methods/   → enabled payment methods for the checkout
 *   POST /payments/submit/    → submit a manual (offline) payment for review
 *
 * Gateway providers (SSLCommerz / Stripe / PayPal) are initiated via
 * checkoutService.initiatePayment — the initiate response carries the
 * client_secret / redirect_url the browser needs.
 */
import { axiosClient } from './axiosClient'
import { endpoints } from './endpoints'
import type { ManualPaymentSubmission, PaymentMethod } from '@/types/models'
import { guestCartToken } from './cart.service'

// ---------------------------------------------------------------------------
// Manual payment submission
// ---------------------------------------------------------------------------

export interface SubmitManualPaymentPayload {
  order_number: string
  /** PK of the PaymentMethod used (BANK_TRANSFER / BKASH / NAGAD / ROCKET). */
  method_id?: number
  /** Customer transaction reference (trx id / bank ref). */
  reference_number: string
  /** Optional receipt image / PDF upload. */
  receipt?: File | null
  notes?: string
  /** Guest identity (guest orders only): phone, or email + lookup_token. */
  phone_number?: string
  email?: string
  lookup_token?: string
}

// ---------------------------------------------------------------------------
// Service object
// ---------------------------------------------------------------------------

export const paymentsService = {
  /** Enabled payment methods available to the storefront checkout. */
  getPaymentMethods: ({ signal }: { signal?: AbortSignal } = {}) =>
    axiosClient
      .get<PaymentMethod[]>(endpoints.payments.methods(), { signal })
      .then((r) => r.data),

  /**
   * Submit a manual payment. Sent as multipart/form-data so the optional
   * receipt file uploads cleanly; a plain JSON body cannot carry a File.
   */
  submitManualPayment: (payload: SubmitManualPaymentPayload) => {
    const form = new FormData()
    form.append('order_number', payload.order_number)
    if (payload.method_id != null) form.append('method_id', String(payload.method_id))
    form.append('reference_number', payload.reference_number)
    if (payload.receipt) form.append('receipt', payload.receipt)
    if (payload.notes) form.append('notes', payload.notes)
    if (payload.phone_number) form.append('phone_number', payload.phone_number)
    if (payload.email) form.append('email', payload.email)
    if (payload.lookup_token) form.append('lookup_token', payload.lookup_token)

    const token = guestCartToken.get()
    return axiosClient
      .post<ManualPaymentSubmission>(endpoints.payments.submit(), form, {
        headers: { 'Content-Type': 'multipart/form-data', ...(token ? { 'X-Cart-Token': token } : {}) },
      })
      .then((r) => r.data)
  },
}
