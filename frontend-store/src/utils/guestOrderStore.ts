/**
 * Guest order lookup-token persistence (audit H-4).
 *
 * The backend returns a plain `guest_lookup_token` exactly once, at checkout
 * time. We persist it per order number in sessionStorage (survives reloads,
 * not tabs) so the success page and the track-order form can pre-fill it —
 * the guest can track/cancel with Order Number + Email + Token, or simply
 * Order Number + Phone.
 */
const KEY_PREFIX = 'shopcore-guest-order-'

export const guestOrderStore = {
  save: (orderNumber: string, token: string): void => {
    try {
      sessionStorage.setItem(`${KEY_PREFIX}${orderNumber}`, token)
    } catch {
      // ignore quota / privacy-mode failures
    }
  },
  get: (orderNumber: string): string | null => {
    try {
      return sessionStorage.getItem(`${KEY_PREFIX}${orderNumber}`)
    } catch {
      return null
    }
  },
  clear: (orderNumber: string): void => {
    try {
      sessionStorage.removeItem(`${KEY_PREFIX}${orderNumber}`)
    } catch {
      // ignore
    }
  },
}
