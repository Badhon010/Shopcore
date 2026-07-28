/**
 * Format a numeric value as currency.
 * Accepts string (from Django DecimalField) or number.
 */
export function formatCurrency(value: string | number, currency = 'USD'): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

/**
 * Format an ISO date string as a human-readable date.
 */
export function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return '—'
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(isoString))
  } catch {
    return '—'
  }
}

/**
 * Format an ISO date string as a human-readable datetime.
 */
export function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) return '—'
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(isoString))
  } catch {
    return '—'
  }
}

/**
 * Format a relative time (e.g. "2 hours ago").
 */
export function formatRelativeTime(isoString: string | null | undefined): string {
  if (!isoString) return '—'
  try {
    const diff = Date.now() - new Date(isoString).getTime()
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
    const seconds = Math.round(diff / 1000)
    if (Math.abs(seconds) < 60) return rtf.format(-seconds, 'second')
    const minutes = Math.round(seconds / 60)
    if (Math.abs(minutes) < 60) return rtf.format(-minutes, 'minute')
    const hours = Math.round(minutes / 60)
    if (Math.abs(hours) < 24) return rtf.format(-hours, 'hour')
    const days = Math.round(hours / 24)
    if (Math.abs(days) < 30) return rtf.format(-days, 'day')
    return formatDate(isoString)
  } catch {
    return '—'
  }
}

/**
 * Truncate a string to maxLength, appending ellipsis.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength) + '…'
}

/**
 * Format a number with thousands separators.
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}

/**
 * Format a percentage change for trend indicators.
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`
}
