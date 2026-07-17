import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { CheckCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { emailSchema } from '@/utils/validators'
import { authService } from '@/services/api/auth.service'
import { ROUTES } from '@/constants/routes'
import type { ApiError } from '@/types/api'

const schema = z.object({ email: emailSchema })
type FormData = z.infer<typeof schema>

export function ForgotPasswordForm() {
  const [submitted, setSubmitted] = useState(false)

  const mutation = useMutation({
    mutationFn: (data: FormData) => authService.forgotPassword(data),
  })

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  })

  const onSubmit = async (data: FormData) => {
    try {
      await mutation.mutateAsync(data)
      setSubmitted(true)
    } catch (err) {
      const apiErr = err as ApiError
      form.setError('root', { message: apiErr.message })
    }
  }

  if (submitted) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
          <CheckCircle className="h-7 w-7 text-success" />
        </div>
        <h1 className="text-heading-md font-semibold text-text-primary">Check your email</h1>
        <p className="mt-2 text-body-sm text-text-secondary">
          We&apos;ve sent a password reset link to your email address.
        </p>
        <Link to={ROUTES.LOGIN} className="mt-6 inline-block text-body-sm text-accent hover:underline">
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div className="mb-6">
        <h1 className="text-heading-md font-semibold text-text-primary">Reset your password</h1>
        <p className="mt-1 text-body-sm text-text-secondary">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>

      {form.formState.errors.root && (
        <div role="alert" className="rounded-lg bg-danger-subtle border border-danger/20 p-3 text-body-sm text-danger">
          {form.formState.errors.root.message}
        </div>
      )}

      <FormField label="Email" required error={form.formState.errors.email?.message}>
        {(id, errorId) => (
          <Input
            id={id}
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            error={!!form.formState.errors.email}
            errorId={errorId}
            {...form.register('email')}
          />
        )}
      </FormField>

      <Button type="submit" className="w-full" size="lg" isLoading={mutation.isPending} loadingText="Sending…">
        Send reset link
      </Button>

      <Link to={ROUTES.LOGIN} className="block text-center text-body-sm text-text-secondary hover:text-text-primary">
        Back to sign in
      </Link>
    </form>
  )
}
