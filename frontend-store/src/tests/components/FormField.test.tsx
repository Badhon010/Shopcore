import { describe, it, expect } from 'vitest'
import { render, screen } from '../test-utils'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'

describe('FormField', () => {
  it('renders a label associated with the input', () => {
    render(
      <FormField label="Email">
        {(id, errorId) => <Input id={id} errorId={errorId} />}
      </FormField>
    )
    const label = screen.getByText('Email')
    expect(label.tagName).toBe('LABEL')
    const input = screen.getByRole('textbox')
    expect(label).toHaveAttribute('for', input.id)
  })

  it('renders a required asterisk when required=true', () => {
    render(
      <FormField label="Name" required>
        {(id) => <Input id={id} />}
      </FormField>
    )
    expect(screen.getByText('*', { exact: false })).toBeInTheDocument()
  })

  it('renders an error message with role=alert', () => {
    render(
      <FormField label="Email" error="Invalid email">
        {(id, errorId) => <Input id={id} errorId={errorId} error />}
      </FormField>
    )
    const errorEl = screen.getByRole('alert')
    expect(errorEl).toHaveTextContent('Invalid email')
  })

  it('renders helper text when no error is present', () => {
    render(
      <FormField label="Email" helperText="We'll never share your email">
        {(id) => <Input id={id} />}
      </FormField>
    )
    expect(screen.getByText("We'll never share your email")).toBeInTheDocument()
  })

  it('prefers error over helper text', () => {
    render(
      <FormField label="Email" error="Invalid" helperText="Hint">
        {(id) => <Input id={id} error />}
      </FormField>
    )
    expect(screen.getByText('Invalid')).toBeInTheDocument()
    expect(screen.queryByText('Hint')).not.toBeInTheDocument()
  })
})
