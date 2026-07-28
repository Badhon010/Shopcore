import { type ReactNode } from 'react'

interface AuthLayoutProps {
  children: ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-md">
            <span className="text-sm font-bold text-primary-foreground">S</span>
          </div>
          <div className="text-center">
            <h1 className="text-lg font-semibold text-text-primary">ShopCore Admin</h1>
            <p className="text-sm text-text-muted">Staff access only</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}
