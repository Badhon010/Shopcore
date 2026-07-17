import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/Button'

describe('Button', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('renders all variants without throwing', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>)
    rerender(<Button variant="secondary">Secondary</Button>)
    rerender(<Button variant="ghost">Ghost</Button>)
    rerender(<Button variant="destructive">Destructive</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('renders all sizes', () => {
    const { rerender } = render(<Button size="sm">Small</Button>)
    rerender(<Button size="md">Medium</Button>)
    rerender(<Button size="lg">Large</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup()
    const handler = vi.fn()
    render(<Button onClick={handler}>Click</Button>)
    await user.click(screen.getByRole('button'))
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('disables the button when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('shows loading state and disables interaction when isLoading', async () => {
    const user = userEvent.setup()
    const handler = vi.fn()
    render(<Button isLoading onClick={handler}>Submit</Button>)
    const btn = screen.getByRole('button')
    expect(btn).toBeDisabled()
    expect(btn).toHaveAttribute('aria-busy', 'true')
    await user.click(btn)
    expect(handler).not.toHaveBeenCalled()
  })

  it('shows loading text when provided', () => {
    render(<Button isLoading loadingText="Saving…">Save</Button>)
    expect(screen.getByText('Saving…')).toBeInTheDocument()
  })

  it('is keyboard accessible — triggers on Enter', async () => {
    const user = userEvent.setup()
    const handler = vi.fn()
    render(<Button onClick={handler}>Submit</Button>)
    screen.getByRole('button').focus()
    await user.keyboard('{Enter}')
    expect(handler).toHaveBeenCalledTimes(1)
  })
})
