import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Checkbox } from '@/components/ui/Checkbox'
import { Button } from '@/components/ui/Button'
import type { Address } from '@/types/models'

const addressSchema = z.object({
  first_name: z.string().min(1, 'Required'),
  last_name: z.string().min(1, 'Required'),
  company: z.string().optional(),
  address_line_1: z.string().min(1, 'Required'),
  address_line_2: z.string().optional(),
  city: z.string().min(1, 'Required'),
  state: z.string().min(1, 'Required'),
  postal_code: z.string().min(1, 'Required'),
  country: z.string().min(2, 'Required'),
  phone: z.string().optional(),
  is_default: z.boolean().default(false),
})

type AddressFormData = z.infer<typeof addressSchema>

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
      first_name: defaultValues?.first_name ?? '',
      last_name: defaultValues?.last_name ?? '',
      company: defaultValues?.company ?? '',
      address_line_1: defaultValues?.address_line_1 ?? '',
      address_line_2: defaultValues?.address_line_2 ?? '',
      city: defaultValues?.city ?? '',
      state: defaultValues?.state ?? '',
      postal_code: defaultValues?.postal_code ?? '',
      country: defaultValues?.country ?? 'US',
      phone: defaultValues?.phone ?? '',
      is_default: defaultValues?.is_default ?? false,
    },
  })

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="First name" required error={form.formState.errors.first_name?.message}>
          {(id) => <Input id={id} {...form.register('first_name')} error={!!form.formState.errors.first_name} />}
        </FormField>
        <FormField label="Last name" required error={form.formState.errors.last_name?.message}>
          {(id) => <Input id={id} {...form.register('last_name')} error={!!form.formState.errors.last_name} />}
        </FormField>
      </div>

      <FormField label="Company" error={form.formState.errors.company?.message}>
        {(id) => <Input id={id} {...form.register('company')} />}
      </FormField>

      <FormField label="Address line 1" required error={form.formState.errors.address_line_1?.message}>
        {(id) => <Input id={id} autoComplete="address-line1" {...form.register('address_line_1')} error={!!form.formState.errors.address_line_1} />}
      </FormField>

      <FormField label="Address line 2" error={form.formState.errors.address_line_2?.message}>
        {(id) => <Input id={id} autoComplete="address-line2" {...form.register('address_line_2')} />}
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="City" required error={form.formState.errors.city?.message}>
          {(id) => <Input id={id} autoComplete="address-level2" {...form.register('city')} error={!!form.formState.errors.city} />}
        </FormField>
        <FormField label="State / Province" required error={form.formState.errors.state?.message}>
          {(id) => <Input id={id} autoComplete="address-level1" {...form.register('state')} error={!!form.formState.errors.state} />}
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Postal code" required error={form.formState.errors.postal_code?.message}>
          {(id) => <Input id={id} autoComplete="postal-code" {...form.register('postal_code')} error={!!form.formState.errors.postal_code} />}
        </FormField>
        <FormField label="Country" required error={form.formState.errors.country?.message}>
          {(id) => <Input id={id} autoComplete="country" {...form.register('country')} error={!!form.formState.errors.country} />}
        </FormField>
      </div>

      <FormField label="Phone" error={form.formState.errors.phone?.message}>
        {(id) => <Input id={id} type="tel" autoComplete="tel" {...form.register('phone')} />}
      </FormField>

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
