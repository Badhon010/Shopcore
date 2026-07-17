import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { emailSchema, passwordSchema } from '@/utils/validators'
import { ROUTES } from '@/constants/routes'
import { useRegister } from '../hooks/useLogin'
import { applyServerErrors } from '@/services/api/axiosClient'
import type { ApiError } from '@/types/api'

const registerSchema = z
  .object({
    first_name: z.string().min(1, 'First name is required'),
    last_name: z.string().min(1, 'Last name is required'),
    email: emailSchema,
    password: passwordSchema,
    password_confirm: z.string().min(1, 'Please confirm your password'),
  })
  .refine((d) => d.password === d.password_confirm, {
    message: 'Passwords do not match',
    path: ['password_confirm'],
  })

type RegisterFormData = z.infer<typeof registerSchema>

function getPasswordStrength(pw: string): number {
  if (!pw) return 0
  let score = 0
  if (pw.length >= 8) score += 25
  if (/[A-Z]/.test(pw)) score += 25
  if (/[0-9]/.test(pw)) score += 25
  if (/[^A-Za-z0-9]/.test(pw)) score += 25
  return score
}

export function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()
  const register = useRegister()

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { first_name: '', last_name: '', email: '', password: '', password_confirm: '' },
  })

  const passwordValue = form.watch('password')
  const strength = getPasswordStrength(passwordValue)

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await register.mutateAsync(data)
      navigate(ROUTES.ACCOUNT, { replace: true })
    } catch (err) {
      const apiErr = err as ApiError
      applyServerErrors(form.setError, apiErr.fieldErrors)
      if (!apiErr.fieldErrors) {
        form.setError('root', { message: apiErr.message })
      }
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div className="mb-6">
        <h1 className="text-heading-md font-semibold text-text-primary">Create your account</h1>
        <p className="mt-1 text-body-sm text-text-secondary">Join ShopCore and start shopping</p>
      </div>

      {form.formState.errors.root && (
        <div role="alert" className="rounded-lg bg-danger-subtle border border-danger/20 p-3 text-body-sm text-danger">
          {form.formState.errors.root.message}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <FormField label="First name" required error={form.formState.errors.first_name?.message}>
          {(id, errorId) => (
            <Input
              id={id}
              autoComplete="given-name"
              error={!!form.formState.errors.first_name}
              errorId={errorId}
              {...form.register('first_name')}
            />
          )}
        </FormField>
        <FormField label="Last name" required error={form.formState.errors.last_name?.message}>
          {(id, errorId) => (
            <Input
              id={id}
              autoComplete="family-name"
              error={!!form.formState.errors.last_name}
              errorId={errorId}
              {...form.register('last_name')}
            />
          )}
        </FormField>
      </div>

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

      <FormField label="Password" required error={form.formState.errors.password?.message}>
        {(id, errorId) => (
          <div className="space-y-2">
            <div className="relative">
              <Input
                id={id}
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                error={!!form.formState.errors.password}
                errorId={errorId}
                className="pr-10"
                {...form.register('password')}
              />
              <IconButton
                type="button"
                label={showPassword ? 'Hide password' : 'Show password'}
                size="sm"
                className="absolute right-1 top-1"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </IconButton>
            </div>
            {passwordValue && (
              <ProgressBar
                value={strength}
                variant={strength < 50 ? 'danger' : strength < 75 ? 'warning' : 'success'}
                label="Password strength"
              />
            )}
          </div>
        )}
      </FormField>

      <FormField label="Confirm password" required error={form.formState.errors.password_confirm?.message}>
        {(id, errorId) => (
          <Input
            id={id}
            type="password"
            autoComplete="new-password"
            error={!!form.formState.errors.password_confirm}
            errorId={errorId}
            {...form.register('password_confirm')}
          />
        )}
      </FormField>

      <Button type="submit" className="w-full" size="lg" isLoading={register.isPending} loadingText="Creating account…">
        Create account
      </Button>

      <p className="text-center text-body-sm text-text-secondary">
        Already have an account?{' '}
        <Link to={ROUTES.LOGIN} className="font-medium text-accent hover:underline focus-visible:outline-none">
          Sign in
        </Link>
      </p>
    </form>
  )
}
