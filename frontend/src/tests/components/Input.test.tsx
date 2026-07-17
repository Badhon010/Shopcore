import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from '@/components/ui/Input'

describe('Input', () => {
  it('renders a text input by default', () => {
    render(<Input aria-label="Test input" />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('applies error styles and aria-invalid when error=true', () => {
    render(<Input error aria-label="Test input" />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input.className).toContain('border-danger')
  })

  it('sets aria-describedby when errorId is provided', () => {
    render(<Input error errorId="err-1" aria-label="Test input" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-describedby', 'err-1')
  })

  it('accepts user input', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Input aria-label="Email" onChange={onChange} />)
    await user.type(screen.getByRole('textbox'), 'hello')
    expect(onChange).toHaveBeenCalled()
  })

  it('is disabled when disabled prop is passed', () => {
    render(<Input disabled aria-label="Disabled" />)
    expect(screen.getByRole('textbox')).toBeDisabled()
  })
})
