import { APP_CONFIG } from '@/constants/config'

export function formatCurrency(
  amount: string | number,
  currency?: string,
  locale?: string
): string {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(value)) return '—'

  return new Intl.NumberFormat(locale ?? APP_CONFIG.defaultLocale, {
    style: 'currency',
    currency: currency ?? APP_CONFIG.defaultCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatPrice(
  price: string | number | null | undefined,
  originalPrice?: string | number | null
): {
  formatted: string
  formattedOriginal: string | null
  isDiscounted: boolean
  discountPercent: number | null
} {
  const numPrice = typeof price === 'string' ? parseFloat(price) : (price ?? 0)
  const numOriginal =
    originalPrice != null
      ? typeof originalPrice === 'string'
        ? parseFloat(originalPrice)
        : originalPrice
      : null

  const formatted = formatCurrency(numPrice)
  const isDiscounted = numOriginal !== null && numOriginal > numPrice && numOriginal > 0

  let discountPercent: number | null = null
  if (isDiscounted && numOriginal) {
    discountPercent = Math.round(((numOriginal - numPrice) / numOriginal) * 100)
  }

  return {
    formatted,
    formattedOriginal: isDiscounted && numOriginal ? formatCurrency(numOriginal) : null,
    isDiscounted,
    discountPercent,
  }
}
