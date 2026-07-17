import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { CheckCircle } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { passwordSchema } from '@/utils/validators'
import { authService } from '@/services/api/auth.service'
import { ROUTES } from '@/constants/routes'
import type { ApiError } from '@/types/api'

const schema = z
  .object({
    new_password: passwordSchema,
    new_password_confirm: z.string().min(1, 'Please confirm your password'),
  })
  .refine((d) => d.new_password === d.new_password_confirm, {
    message: 'Passwords do not match',
    path: ['new_password_confirm'],
  })

type FormData = z.infer<typeof schema>

export function ResetPasswordForm() {
  const { uid = '', token = '' } = useParams()
  const [success, setSuccess] = useState(false)

  const mutation = useMutation({
    mutationFn: (data: FormData) => authService.resetPassword({ uid, token, ...data }),
  })

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      await mutation.mutateAsync(data)
      setSuccess(true)
    } catch (err) {
      form.setError('root', { message: (err as ApiError).message })
    }
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
          <CheckCircle className="h-7 w-7 text-success" />
        </div>
        <h1 className="text-heading-md font-semibold text-text-primary">Password reset!</h1>
        <p className="mt-2 text-body-sm text-text-secondary">Your password has been updated.</p>
        <Link to={ROUTES.LOGIN} className="mt-6 inline-block text-body-sm text-accent hover:underline">
          Sign in with new password
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div className="mb-6">
        <h1 className="text-heading-md font-semibold text-text-primary">Set new password</h1>
      </div>
      {form.formState.errors.root && (
        <div role="alert" className="rounded-lg bg-danger-subtle border border-danger/20 p-3 text-body-sm text-danger">
          {form.formState.errors.root.message}
        </div>
      )}
      <FormField label="New password" required error={form.formState.errors.new_password?.message}>
        {(id, errorId) => (
          <Input id={id} type="password" error={!!form.formState.errors.new_password} errorId={errorId} {...form.register('new_password')} />
        )}
      </FormField>
      <FormField label="Confirm new password" required error={form.formState.errors.new_password_confirm?.message}>
        {(id, errorId) => (
          <Input id={id} type="password" error={!!form.formState.errors.new_password_confirm} errorId={errorId} {...form.register('new_password_confirm')} />
        )}
      </FormField>
      <Button type="submit" className="w-full" size="lg" isLoading={mutation.isPending}>
        Reset password
      </Button>
    </form>
  )
}
