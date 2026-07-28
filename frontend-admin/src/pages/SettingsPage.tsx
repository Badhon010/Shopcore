import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { Moon, Sun, Monitor, Save } from 'lucide-react'
import { authService } from '@/services/api/auth.service'
import { Card, CardTitle, CardHeader } from '@/components/ui/Card'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme, type ThemeMode } from '@/contexts/ThemeContext'
import { useToast } from '@/contexts/ToastContext'
import { cn } from '@/utils/cn'

const passwordSchema = z.object({
  old_password:     z.string().min(1, 'Current password is required'),
  new_password:     z.string().min(8, 'Must be at least 8 characters'),
  confirm_password: z.string(),
}).refine((d) => d.new_password === d.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})
type PasswordForm = z.infer<typeof passwordSchema>

const THEME_OPTIONS: { value: ThemeMode; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Monitor },
]

export function SettingsPage() {
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()
  const { toast } = useToast()

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  })

  const passwordMutation = useMutation({
    mutationFn: (data: PasswordForm) => authService.changePassword(data),
    onSuccess: () => {
      toast({ title: 'Password changed', variant: 'success' })
      reset()
    },
    onError: () => toast({ title: 'Failed to change password', variant: 'destructive' }),
  })

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-text-primary">Settings</h1>
        <p className="text-sm text-text-muted">Manage your account and preferences</p>
      </div>

      {/* Profile info (read-only) */}
      <Card>
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Name">
            <Input value={user?.full_name ?? ''} readOnly className="cursor-default opacity-70" />
          </FormField>
          <FormField label="Email">
            <Input value={user?.email ?? ''} readOnly className="cursor-default opacity-70" />
          </FormField>
        </div>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader><CardTitle>Appearance</CardTitle></CardHeader>
        <div className="flex gap-3">
          {THEME_OPTIONS.map(({ value, label, Icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={cn(
                'flex flex-1 flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium transition-all',
                theme === value
                  ? 'border-primary bg-primary-light text-primary'
                  : 'border-border text-text-secondary hover:border-border-strong hover:bg-bg-subtle'
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </button>
          ))}
        </div>
      </Card>

      {/* Change password */}
      <Card>
        <CardHeader><CardTitle>Change password</CardTitle></CardHeader>
        <form onSubmit={handleSubmit((v) => passwordMutation.mutate(v))} noValidate className="space-y-4">
          <FormField label="Current password" htmlFor="old_password" error={errors.old_password?.message} required>
            <Input id="old_password" type="password" autoComplete="current-password" error={!!errors.old_password} {...register('old_password')} />
          </FormField>
          <FormField label="New password" htmlFor="new_password" error={errors.new_password?.message} required>
            <Input id="new_password" type="password" autoComplete="new-password" error={!!errors.new_password} {...register('new_password')} />
          </FormField>
          <FormField label="Confirm new password" htmlFor="confirm_password" error={errors.confirm_password?.message} required>
            <Input id="confirm_password" type="password" autoComplete="new-password" error={!!errors.confirm_password} {...register('confirm_password')} />
          </FormField>
          <div className="flex justify-end">
            <Button type="submit" isLoading={isSubmitting || passwordMutation.isPending}>
              <Save className="h-4 w-4" /> Update password
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
