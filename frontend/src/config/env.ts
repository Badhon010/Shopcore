import { z } from 'zod'

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().min(1, 'VITE_API_BASE_URL is required'),
  VITE_APP_NAME: z.string().default('ShopCore'),
  VITE_ENABLE_WISHLIST: z
    .string()
    .transform((v) => v === 'true')
    .default('true'),
  VITE_ENABLE_REVIEWS: z
    .string()
    .transform((v) => v === 'true')
    .default('true'),
  VITE_ENABLE_COUPONS: z
    .string()
    .transform((v) => v === 'true')
    .default('true'),
  VITE_SENTRY_DSN: z.string().optional(),
  VITE_ANALYTICS_ID: z.string().optional(),
  VITE_DEFAULT_CURRENCY: z.string().default('USD'),
  VITE_DEFAULT_LOCALE: z.string().default('en-US'),
})

const parsed = envSchema.safeParse(import.meta.env)

if (!parsed.success) {
  const errors = parsed.error.flatten().fieldErrors
  const missing = Object.entries(errors)
    .map(([key, msgs]) => `  ${key}: ${msgs?.join(', ') ?? 'invalid'}`)
    .join('\n')
  throw new Error(`[ShopCore] Missing or invalid environment variables:\n${missing}`)
}

export const env = parsed.data
