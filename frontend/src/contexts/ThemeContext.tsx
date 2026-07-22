import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { APP_CONFIG } from '@/constants/config'

export type ThemeMode = 'light' | 'dark' | 'system'
export type Brand = 'shopcore' | 'green' | 'purple' | 'pink'

interface ThemeContextValue {
  theme: ThemeMode
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: ThemeMode) => void
  brand: Brand
  setBrand: (brand: Brand) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const BRAND_STORAGE_KEY = 'shopcore-brand'

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') return getSystemTheme()
  return mode
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      const stored = localStorage.getItem(APP_CONFIG.themeKey)
      if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
    } catch {
      // ignore
    }
    return 'system'
  })

  const [brand, setBrandState] = useState<Brand>(() => {
    try {
      const stored = localStorage.getItem(BRAND_STORAGE_KEY)
      if (stored === 'shopcore' || stored === 'green' || stored === 'purple' || stored === 'pink') {
        return stored
      }
    } catch {
      // ignore
    }
    return 'shopcore'
  })

  const resolvedTheme = resolveTheme(theme)

  const applyTheme = useCallback((mode: ThemeMode) => {
    const resolved = resolveTheme(mode)
    if (resolved === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  const applyBrand = useCallback((b: Brand) => {
    document.documentElement.setAttribute('data-brand', b)
  }, [])

  useEffect(() => {
    applyTheme(theme)
  }, [theme, applyTheme])

  useEffect(() => {
    applyBrand(brand)
  }, [brand, applyBrand])

  // Listen for system preference changes
  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme('system')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme, applyTheme])

  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme)
    try {
      localStorage.setItem(APP_CONFIG.themeKey, newTheme)
    } catch {
      // ignore
    }
  }, [])

  const setBrand = useCallback((newBrand: Brand) => {
    setBrandState(newBrand)
    try {
      localStorage.setItem(BRAND_STORAGE_KEY, newBrand)
    } catch {
      // ignore
    }
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, brand, setBrand }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
