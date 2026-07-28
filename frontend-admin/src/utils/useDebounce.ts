import { useEffect, useState } from 'react'

/**
 * Debounce a value by the given delay (default 400ms).
 * Used for search inputs to avoid firing API calls on every keystroke.
 */
export function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
