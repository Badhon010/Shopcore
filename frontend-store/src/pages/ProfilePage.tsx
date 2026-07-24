import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Helmet } from 'react-helmet-async'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/feedback/Spinner'
import { useProfile, useUpdateProfile } from '@/features/account/hooks/useProfile'
import { applyServerErrors } from '@/services/api/axiosClient'
import type { ApiError } from '@/types/api'

const profileSchema = z.object({
  first_name: z.string().min(1, 'Required'),
  last_name: z.string().min(1, 'Required'),
  phone_number: z.string().optional(),
})
type ProfileFormData = z.infer<typeof profileSchema>

export function ProfilePage() {
  const { data: profile, isLoading } = useProfile()
  const update = useUpdateProfile()

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    values: profile ? {
      first_name: profile.first_name,
      last_name: profile.last_name,
      phone_number: profile.phone_number ?? '',
    } : undefined,
  })

  const onSubmit = async (data: ProfileFormData) => {
    try {
      await update.mutateAsync(data)
    } catch (err) {
      applyServerErrors(form.setError, (err as ApiError).fieldErrors)
    }
  }

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>

  return (
    <>
      <Helmet>
        <title>Profile — ShopCore</title>
      </Helmet>
      <div>
        <h1 className="text-heading-lg font-semibold text-text-primary mb-6">Profile</h1>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="max-w-lg space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="First name" required error={form.formState.errors.first_name?.message}>
              {(id) => <Input id={id} {...form.register('first_name')} error={!!form.formState.errors.first_name} />}
            </FormField>
            <FormField label="Last name" required error={form.formState.errors.last_name?.message}>
              {(id) => <Input id={id} {...form.register('last_name')} error={!!form.formState.errors.last_name} />}
            </FormField>
          </div>
          <FormField label="Email" helperText="To change your email, contact support.">
            {(id) => <Input id={id} type="email" value={profile?.email ?? ''} disabled />}
          </FormField>
          <FormField label="Phone" error={form.formState.errors.phone_number?.message}>
            {(id) => <Input id={id} type="tel" {...form.register('phone_number')} />}
          </FormField>
          <Button type="submit" isLoading={update.isPending}>Save changes</Button>
        </form>
      </div>
    </>
  )
}
