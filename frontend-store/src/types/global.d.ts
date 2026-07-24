/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_APP_NAME: string
  readonly VITE_ENABLE_WISHLIST: string
  readonly VITE_ENABLE_REVIEWS: string
  readonly VITE_ENABLE_COUPONS: string
  readonly VITE_SENTRY_DSN?: string
  readonly VITE_ANALYTICS_ID?: string
  readonly VITE_DEFAULT_CURRENCY: string
  readonly VITE_DEFAULT_LOCALE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
