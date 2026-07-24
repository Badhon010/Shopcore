import { APP_CONFIG } from '@/constants/config'

export function formatDate(
  date: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions,
  locale?: string
): string {
  if (date === null || date === undefined) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '—'

  return new Intl.DateTimeFormat(locale ?? APP_CONFIG.defaultLocale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  }).format(d)
}

/**
 * Returns a human-readable relative label for a date.
 * Never throws — invalid, null, or undefined input returns "Unknown date".
 */
export function formatRelativeDate(date: string | Date | null | undefined): string {
  if (date === null || date === undefined) return 'Unknown date'

  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return 'Unknown date'

  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return formatDate(d)
}
