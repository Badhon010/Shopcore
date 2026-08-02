import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { Eye, EyeOff, MailCheck, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { emailSchema, passwordSchema } from '@/utils/validators'
import { ROUTES } from '@/constants/routes'
import { useRegister } from '../hooks/useLogin'
import { applyServerErrors } from '@/services/api/axiosClient'
import { authService } from '@/services/api/auth.service'
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
  if (pw.length >= 10) score += 25
  if (/[A-Z]/.test(pw)) score += 25
  if (/[0-9]/.test(pw)) score += 25
  if (/[^A-Za-z0-9]/.test(pw)) score += 25
  return score
}

// ── Success screen shown after registration ────────────────────────────────
function CheckInboxScreen({ email }: { email: string }) {
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent'>('idle')

  const handleResend = async () => {
    if (resendStatus !== 'idle') return
    setResendStatus('sending')
    try {
      await authService.resendVerification({ email })
      setResendStatus('sent')
    } catch {
      setResendStatus('idle')
    }
  }

  return (
    <div className="text-center space-y-4">
      <div className="flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success-subtle">
          <MailCheck className="h-8 w-8 text-success" />
        </div>
      </div>

      <div>
        <h1 className="text-heading-md font-semibold text-text-primary">Check your inbox</h1>
        <p className="mt-2 text-body-sm text-text-secondary">
          We sent a verification link to
        </p>
        <p className="mt-0.5 font-medium text-text-primary">{email}</p>
        <p className="mt-2 text-body-sm text-text-secondary">
          Click the link in that email to activate your account.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface-secondary p-4 text-left text-body-sm text-text-secondary space-y-1">
        <p className="font-medium text-text-primary">Didn&apos;t receive it?</p>
        <p>Check your spam folder, or resend the email below.</p>
      </div>

      <button
        type="button"
        onClick={handleResend}
        disabled={resendStatus !== 'idle'}
        className="inline-flex items-center gap-2 text-body-sm font-medium text-accent hover:underline disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none"
      >
        {resendStatus === 'sending' && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
        {resendStatus === 'idle' && 'Resend verification email'}
        {resendStatus === 'sending' && 'Sending…'}
        {resendStatus === 'sent' && '✓ Email sent — check your inbox'}
      </button>

      <p className="text-body-sm text-text-secondary">
        Already verified?{' '}
        <Link to={ROUTES.LOGIN} className="font-medium text-accent hover:underline focus-visible:outline-none">
          Sign in
        </Link>
      </p>
    </div>
  )
}

// ── Registration form ──────────────────────────────────────────────────────
export function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null)
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
      // Show "check your inbox" screen — don't navigate, don't auto-login.
      setRegisteredEmail(data.email)
    } catch (err) {
      const apiErr = err as ApiError
      applyServerErrors(form.setError, apiErr.fieldErrors)
      // Always show a root banner so the user gets immediate feedback,
      // even when the error is attached to a field that may be off-screen.
      form.setError('root', {
        message: apiErr.fieldErrors?.email?.[0] ?? apiErr.message,
      })
    }
  }

  if (registeredEmail) {
    return <CheckInboxScreen email={registeredEmail} />
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
              placeholder="Jane"
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
              placeholder="Smith"
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
                placeholder="Create a password"
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
          <div className="relative">
            <Input
              id={id}
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Re-enter your password"
              error={!!form.formState.errors.password_confirm}
              errorId={errorId}
              className="pr-10"
              {...form.register('password_confirm')}
            />
            <IconButton
              type="button"
              label={showConfirmPassword ? 'Hide password' : 'Show password'}
              size="sm"
              className="absolute right-1 top-1"
              onClick={() => setShowConfirmPassword((v) => !v)}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </IconButton>
          </div>
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
