import { axiosClient } from './axiosClient'
import { endpoints } from './endpoints'
import { normalizeCart } from './normalizers'
import type { Cart } from '@/types/models'
import { APP_CONFIG } from '@/constants/config'

// Shape returned by POST /coupons/apply/ — a stateless discount *preview*,
// not a Cart. It must never be written directly into cart cache state.
export interface CouponApplyResult {
  code: string
  discount_type: 'percentage' | 'fixed'
  discount_value: string
  discount_amount: string
  subtotal_after_discount: string
}

export interface AddToCartPayload {
  product_id: string
  variant_id?: string
  quantity: number
}

export interface UpdateCartItemPayload {
  quantity: number
}

// CONTRACT-ASSUMPTION: Guest carts use a cart token stored in localStorage.
// Only the token is stored — cart contents are always fetched from the backend.
export const guestCartToken = {
  get: (): string | null => {
    try {
      return localStorage.getItem(APP_CONFIG.cartTokenKey)
    } catch {
      return null
    }
  },
  set: (token: string): void => {
    try {
      localStorage.setItem(APP_CONFIG.cartTokenKey, token)
    } catch {
      // ignore
    }
  },
  clear: (): void => {
    try {
      localStorage.removeItem(APP_CONFIG.cartTokenKey)
    } catch {
      // ignore
    }
  },
  /**
   * Return the existing guest cart token or create a fresh one. Called on
   * first add-to-cart when anonymous (audit H-4) — the backend keys the
   * guest cart off this token via the X-Cart-Token header.
   */
  ensure: (): string => {
    const existing = guestCartToken.get()
    if (existing) return existing
    const fresh = `gc_${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`
    guestCartToken.set(fresh)
    return fresh
  },
}

function getCartHeaders(): Record<string, string> {
  const token = guestCartToken.get()
  return token ? { 'X-Cart-Token': token } : {}
}

export const cartService = {
  getCart: ({ signal }: { signal?: AbortSignal } = {}) =>
    axiosClient
      .get<Cart>(endpoints.cart.detail(), { headers: getCartHeaders(), signal })
      .then((r) => normalizeCart(r.data)),

  addItem: (payload: AddToCartPayload) =>
    axiosClient
      .post<Cart>(endpoints.cart.items(), payload, { headers: getCartHeaders() })
      .then((r) => normalizeCart(r.data)),

  updateItem: (itemId: string, payload: UpdateCartItemPayload) =>
    axiosClient
      .patch<Cart>(endpoints.cart.item(itemId), payload, { headers: getCartHeaders() })
      .then((r) => normalizeCart(r.data)),

  removeItem: (itemId: string) =>
    axiosClient
      .delete<Cart>(endpoints.cart.item(itemId), { headers: getCartHeaders() })
      .then((r) => normalizeCart(r.data)),

  // Backend only exposes a coupon *preview/apply* endpoint, not a
  // stateful cart-coupon resource: it returns a discount preview, not a
  // Cart. There is no removeCoupon endpoint on the backend either — the
  // caller is responsible for merging this preview into cart state.
  applyCoupon: (code: string) =>
    axiosClient
      .post<CouponApplyResult>(endpoints.cart.coupon(), { code }, { headers: getCartHeaders() })
      .then((r) => r.data),

  clearCart: () =>
    axiosClient
      .post<Cart>(endpoints.cart.clear(), undefined, { headers: getCartHeaders() })
      .then((r) => normalizeCart(r.data)),
}
