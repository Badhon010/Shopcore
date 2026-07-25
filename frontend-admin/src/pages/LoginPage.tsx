import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LockKeyhole } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { IconButton } from '@/components/ui/IconButton'
import { Input } from '@/components/ui/Input'
import { applyServerErrors } from '@/services/api/axiosClient'
import { useAuth } from '@/contexts/AuthContext'
import { emailSchema } from '@/utils/validators'
import type { ApiError } from '@/types/api'

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/'

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data)
      navigate(from, { replace: true })
    } catch (error) {
      const apiError = error as ApiError
      applyServerErrors(form.setError, apiError.fieldErrors)
      if (!apiError.fieldErrors) {
        form.setError('root', { message: apiError.message || 'Unable to sign in.' })
      }
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-5">
      <div className="mb-7">
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-light text-primary">
          <LockKeyhole className="h-5 w-5" aria-hidden />
        </div>
        <h1 className="text-heading-md font-semibold text-text-primary">Welcome back</h1>
        <p className="mt-1 text-body-sm text-text-secondary">Sign in with your ShopCore staff account.</p>
      </div>

      {form.formState.errors.root && (
        <div role="alert" className="rounded-lg border border-danger/20 bg-danger-subtle p-3 text-body-sm text-danger">
          {form.formState.errors.root.message}
        </div>
      )}

      <FormField label="Email" required error={form.formState.errors.email?.message}>
        {(id, errorId) => (
          <Input
            id={id}
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            error={!!form.formState.errors.email}
            errorId={errorId}
            {...form.register('email')}
          />
        )}
      </FormField>

      <FormField label="Password" required error={form.formState.errors.password?.message}>
        {(id, errorId) => (
          <div className="relative">
            <Input
              id={id}
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Your password"
              error={!!form.formState.errors.password}
              errorId={errorId}
              className="pr-12"
              {...form.register('password')}
            />
            <IconButton
              type="button"
              label={showPassword ? 'Hide password' : 'Show password'}
              size="sm"
              className="absolute right-1 top-1.5"
              onClick={() => setShowPassword((current) => !current)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </IconButton>
          </div>
        )}
      </FormField>

      <Button type="submit" className="w-full" size="lg" isLoading={form.formState.isSubmitting} loadingText="Signing in…">
        Sign in
      </Button>
    </form>
  )
}