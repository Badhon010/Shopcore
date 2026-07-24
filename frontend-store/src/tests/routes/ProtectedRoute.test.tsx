import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { ToastProvider } from '@/contexts/ToastContext'
import { CartUIProvider } from '@/contexts/CartUIContext'

// Mock auth context with controllable state
let mockIsAuthenticated = false
let mockIsLoading = false

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: mockIsAuthenticated,
    isLoading: mockIsLoading,
    user: null,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

function TestWrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <HelmetProvider>
      <QueryClientProvider client={qc}>
        <ThemeProvider>
          <CartUIProvider>
            <ToastProvider>{children}</ToastProvider>
          </CartUIProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </HelmetProvider>
  )
}

describe('ProtectedRoute', () => {
  it('redirects unauthenticated users to /login', () => {
    mockIsAuthenticated = false
    mockIsLoading = false

    render(
      <TestWrapper>
        <MemoryRouter initialEntries={['/account']}>
          <Routes>
            <Route path="/login" element={<p>Login page</p>} />
            <Route
              path="/account"
              element={
                <ProtectedRoute>
                  <p>Account page</p>
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      </TestWrapper>
    )

    expect(screen.getByText('Login page')).toBeInTheDocument()
    expect(screen.queryByText('Account page')).not.toBeInTheDocument()
  })

  it('renders children when user is authenticated', () => {
    mockIsAuthenticated = true
    mockIsLoading = false

    render(
      <TestWrapper>
        <MemoryRouter initialEntries={['/account']}>
          <Routes>
            <Route path="/login" element={<p>Login page</p>} />
            <Route
              path="/account"
              element={
                <ProtectedRoute>
                  <p>Account page</p>
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      </TestWrapper>
    )

    expect(screen.getByText('Account page')).toBeInTheDocument()
    expect(screen.queryByText('Login page')).not.toBeInTheDocument()
  })
})
