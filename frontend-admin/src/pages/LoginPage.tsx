import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useLocation } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { applyServerErrors } from '@/services/api/axiosClient'
import type { ApiError } from '@/types/api'
import { ROUTES } from '@/constants/routes'

const schema = z.object({
  email:    z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})
type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const { login } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? ROUTES.DASHBOARD

  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (values: FormValues) => {
    try {
      await login(values)
      navigate(from, { replace: true })
    } catch (err) {
      const apiErr = err as ApiError
      if (apiErr.fieldErrors) {
        applyServerErrors(setError, apiErr.fieldErrors)
      } else {
        toast({ title: 'Login failed', description: apiErr.message, variant: 'destructive' })
      }
    }
  }

  return (
    <div className="admin-surface p-6">
      <div className="mb-6">
        <h2 className="text-base font-semibold text-text-primary">Sign in to your account</h2>
        <p className="mt-1 text-sm text-text-secondary">Staff credentials required</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <FormField label="Email address" htmlFor="email" error={errors.email?.message} required>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            autoFocus
            error={!!errors.email}
            placeholder="you@company.com"
            {...register('email')}
          />
        </FormField>

        <FormField label="Password" htmlFor="password" error={errors.password?.message} required>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            error={!!errors.password}
            placeholder="••••••••"
            {...register('password')}
          />
        </FormField>

        <Button
          type="submit"
          className="w-full"
          isLoading={isSubmitting}
          loadingText="Signing in…"
          size="lg"
        >
          <LogIn className="h-4 w-4" />
          Sign in
        </Button>
      </form>
    </div>
  )
}
