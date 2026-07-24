import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Checkbox } from '@/components/ui/Checkbox'
import { Button } from '@/components/ui/Button'
import type { Address } from '@/types/models'
import type { ApiError } from '@/types/api'
import { applyServerErrors } from '@/services/api/axiosClient'

// Phone regex matches the backend's validator: ^\+?1?\d{9,15}$
const PHONE_RE = /^\+?1?\d{9,15}$/

const addressSchema = z.object({
  full_name:       z.string().min(1, 'Required'),
  phone_number:    z.string().regex(PHONE_RE, 'Enter a valid phone number (e.g. +12025551234)'),
  address_line_1:  z.string().min(1, 'Required'),
  address_line_2:  z.string().optional(),
  city:            z.string().min(1, 'Required'),
  state_province:  z.string().min(1, 'Required'),
  postal_code:     z.string().min(1, 'Required'),
  country:         z.string().length(2, 'Enter a 2-letter country code (e.g. US)'),
  address_type:    z.enum(['SHIPPING', 'BILLING', 'BOTH']).default('SHIPPING'),
  is_default:      z.boolean().default(false),
})

export type AddressFormData = z.infer<typeof addressSchema>

interface AddressFormProps {
  defaultValues?: Partial<Address>
  onSubmit: (data: AddressFormData) => void | Promise<void>
  isSubmitting?: boolean
  submitLabel?: string
}

export function AddressForm({
  defaultValues,
  onSubmit,
  isSubmitting,
  submitLabel = 'Save address',
}: AddressFormProps) {
  const form = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      full_name:      defaultValues?.full_name      ?? '',
      phone_number:   defaultValues?.phone_number   ?? '',
      address_line_1: defaultValues?.address_line_1 ?? '',
      address_line_2: defaultValues?.address_line_2 ?? '',
      city:           defaultValues?.city           ?? '',
      state_province: defaultValues?.state_province ?? '',
      postal_code:    defaultValues?.postal_code    ?? '',
      country:        defaultValues?.country        ?? 'US',
      address_type:   defaultValues?.address_type   ?? 'SHIPPING',
      is_default:     defaultValues?.is_default     ?? false,
    },
  })

  // Wrap react-hook-form's handleSubmit so that if the async onSubmit
  // rejects with an ApiError, any DRF field-level errors are forwarded
  // directly to the relevant form fields via setError — keeping the
  // error keys identical to what Django returns.
  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      await onSubmit(data)
    } catch (err) {
      const apiErr = err as ApiError
      if (apiErr?.fieldErrors) {
        applyServerErrors(form.setError, apiErr.fieldErrors)
      }
    }
  })

  const { errors } = form.formState

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <FormField label="Full name" required error={errors.full_name?.message}>
        {(id) => (
          <Input
            id={id}
            autoComplete="name"
            placeholder="Jane Smith"
            {...form.register('full_name')}
            error={!!errors.full_name}
          />
        )}
      </FormField>

      <FormField label="Phone number" required error={errors.phone_number?.message}>
        {(id) => (
          <Input
            id={id}
            type="tel"
            autoComplete="tel"
            placeholder="+12025551234"
            {...form.register('phone_number')}
            error={!!errors.phone_number}
          />
        )}
      </FormField>

      <FormField label="Address line 1" required error={errors.address_line_1?.message}>
        {(id) => (
          <Input
            id={id}
            autoComplete="address-line1"
            {...form.register('address_line_1')}
            error={!!errors.address_line_1}
          />
        )}
      </FormField>

      <FormField label="Address line 2" error={errors.address_line_2?.message}>
        {(id) => (
          <Input id={id} autoComplete="address-line2" {...form.register('address_line_2')} />
        )}
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="City" required error={errors.city?.message}>
          {(id) => (
            <Input
              id={id}
              autoComplete="address-level2"
              {...form.register('city')}
              error={!!errors.city}
            />
          )}
        </FormField>
        <FormField label="State / Province" required error={errors.state_province?.message}>
          {(id) => (
            <Input
              id={id}
              autoComplete="address-level1"
              {...form.register('state_province')}
              error={!!errors.state_province}
            />
          )}
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Postal code" required error={errors.postal_code?.message}>
          {(id) => (
            <Input
              id={id}
              autoComplete="postal-code"
              {...form.register('postal_code')}
              error={!!errors.postal_code}
            />
          )}
        </FormField>
        <FormField label="Country" required error={errors.country?.message}>
          {(id) => (
            <Input
              id={id}
              autoComplete="country"
              placeholder="US"
              maxLength={2}
              {...form.register('country')}
              error={!!errors.country}
            />
          )}
        </FormField>
      </div>

      <Checkbox
        id="is-default"
        label="Set as default address"
        checked={form.watch('is_default')}
        onCheckedChange={(v) => form.setValue('is_default', v)}
      />

      <Button type="submit" isLoading={isSubmitting} className="w-full sm:w-auto">
        {submitLabel}
      </Button>
    </form>
  )
}
