import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { emailSchema } from '@/utils/validators'
import { ROUTES } from '@/constants/routes'
import { useLogin } from '../hooks/useLogin'
import { applyServerErrors } from '@/services/api/axiosClient'
import type { ApiError } from '@/types/api'

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const login = useLogin()

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? ROUTES.ACCOUNT

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login.mutateAsync(data)
      navigate(from, { replace: true })
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
        <h1 className="text-heading-md font-semibold text-text-primary">Welcome back</h1>
        <p className="mt-1 text-body-sm text-text-secondary">Sign in to your account</p>
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
              className="pr-10"
              {...form.register('password')}
            />
            <IconButton
              type="button"
              label={showPassword ? 'Hide password' : 'Show password'}
              size="sm"
              className="absolute right-1 top-1"
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </IconButton>
          </div>
        )}
      </FormField>

      <div className="flex justify-end">
        <Link
          to={ROUTES.FORGOT_PASSWORD}
          className="text-body-sm text-accent hover:underline focus-visible:outline-none"
        >
          Forgot password?
        </Link>
      </div>

      <Button type="submit" className="w-full" size="lg" isLoading={login.isPending} loadingText="Signing in…">
        Sign in
      </Button>

      <p className="text-center text-body-sm text-text-secondary">
        Don&apos;t have an account?{' '}
        <Link to={ROUTES.REGISTER} className="font-medium text-accent hover:underline focus-visible:outline-none">
          Create one
        </Link>
      </p>
    </form>
  )
}
