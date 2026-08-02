import { axiosClient } from './axiosClient'
import { endpoints } from './endpoints'
import type { ManualPaymentSubmission, PaymentMethod } from '@/types/models'
import type { PaginatedResponse, ListParams } from '@/types/api'

export interface PaymentMethodParams extends ListParams {
  is_enabled?: boolean
}

export interface PaymentMethodPayload {
  provider?: string
  name?: string
  description?: string
  is_enabled?: boolean
  sort_order?: number
  instructions?: string
  account_number?: string
  account_name?: string
  payment_notes?: string
  is_sandbox?: boolean
  gateway_config?: Record<string, unknown>
}

export interface SubmissionParams extends ListParams {
  status?: string
  order_number?: string
}

export const paymentsService = {
  // ── Payment methods ────────────────────────────────────────
  async listMethods(params?: PaymentMethodParams): Promise<PaginatedResponse<PaymentMethod>> {
    const res = await axiosClient.get<PaginatedResponse<PaymentMethod>>(
      endpoints.payments.methods(), { params }
    )
    return res.data
  },

  async getMethod(pk: string): Promise<PaymentMethod> {
    const res = await axiosClient.get<PaymentMethod>(endpoints.payments.method(pk))
    return res.data
  },

  async createMethod(payload: PaymentMethodPayload): Promise<PaymentMethod> {
    const res = await axiosClient.post<PaymentMethod>(endpoints.payments.methods(), payload)
    return res.data
  },

  async updateMethod(pk: string, payload: Partial<PaymentMethodPayload>): Promise<PaymentMethod> {
    const res = await axiosClient.patch<PaymentMethod>(endpoints.payments.method(pk), payload)
    return res.data
  },

  async deleteMethod(pk: string): Promise<void> {
    await axiosClient.delete(endpoints.payments.method(pk))
  },

  // ── Manual payment submissions ─────────────────────────────
  async listSubmissions(params?: SubmissionParams): Promise<PaginatedResponse<ManualPaymentSubmission>> {
    const res = await axiosClient.get<PaginatedResponse<ManualPaymentSubmission>>(
      endpoints.payments.submissions(), { params }
    )
    return res.data
  },

  async reviewSubmission(
    pk: string,
    payload: { approve: boolean; admin_note?: string }
  ): Promise<ManualPaymentSubmission> {
    const res = await axiosClient.post<ManualPaymentSubmission>(
      endpoints.payments.submissionReview(pk), payload
    )
    return res.data
  },
}
