import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

interface CartUIContextValue {
  isCartOpen: boolean
  openCart: () => void
  closeCart: () => void
  toggleCart: () => void
}

const CartUIContext = createContext<CartUIContextValue | null>(null)

export function CartUIProvider({ children }: { children: ReactNode }) {
  const [isCartOpen, setIsCartOpen] = useState(false)

  const openCart = useCallback(() => setIsCartOpen(true), [])
  const closeCart = useCallback(() => setIsCartOpen(false), [])
  const toggleCart = useCallback(() => setIsCartOpen((v) => !v), [])

  return (
    <CartUIContext.Provider value={{ isCartOpen, openCart, closeCart, toggleCart }}>
      {children}
    </CartUIContext.Provider>
  )
}

export function useCartUI(): CartUIContextValue {
  const ctx = useContext(CartUIContext)
  if (!ctx) throw new Error('useCartUI must be used within CartUIProvider')
  return ctx
}
