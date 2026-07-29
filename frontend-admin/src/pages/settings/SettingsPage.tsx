import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Moon, Sun, Monitor, Shield, User } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { axiosClient, applyServerErrors } from '@/services/api/axiosClient'
import { endpoints } from '@/services/api/endpoints'
import { formatDate } from '@/utils/format'
import { cn } from '@/utils/cn'
import type { ApiError } from '@/types/api'
import type { ThemeMode } from '@/contexts/ThemeContext'

const profileSchema = z.object({
  first_name:   z.string().min(1, 'First name is required'),
  last_name:    z.string().min(1, 'Last name is required'),
  phone_number: z.string().optional(),
})
type ProfileFormData = z.infer<typeof profileSchema>

const passwordSchema = z.object({
  old_password:     z.string().min(1, 'Current password is required'),
  new_password:     z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string().min(1, 'Please confirm your password'),
}).refine((d) => d.new_password === d.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})
type PasswordFormData = z.infer<typeof passwordSchema>

const TABS = [
  { value: 'profile',    label: 'Profile'    },
  { value: 'security',   label: 'Security'   },
  { value: 'appearance', label: 'Appearance' },
]

const THEME_OPTIONS: Array<{ value: ThemeMode; label: string; icon: typeof Sun; description: string }> = [
  { value: 'light',  label: 'Light',  icon: Sun,     description: 'Always use light mode' },
  { value: 'dark',   label: 'Dark',   icon: Moon,    description: 'Always use dark mode' },
  { value: 'system', label: 'System', icon: Monitor, description: 'Follow system preference' },
]

export function SettingsPage() {
  const [tab, setTab] = useState('profile')
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()
  const { toast } = useToast()

  // ── Profile form ──────────────────────────────────────────
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    values: {
      first_name:   user?.first_name   ?? '',
      last_name:    user?.last_name    ?? '',
      phone_number: user?.phone_number ?? '',
    },
  })

  const profileMutation = useMutation({
    mutationFn: (d: ProfileFormData) => axiosClient.patch(endpoints.auth.me(), d),
    onSuccess: () => toast({ title: 'Profile updated', variant: 'success' }),
    onError: (e: ApiError) => {
      applyServerErrors(profileForm.setError, e.fieldErrors)
      toast({ title: e.message, variant: 'destructive' })
    },
  })

  // ── Password form ─────────────────────────────────────────
  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { old_password: '', new_password: '', confirm_password: '' },
  })

  const passwordMutation = useMutation({
    mutationFn: (d: PasswordFormData) =>
      axiosClient.post(endpoints.auth.changePassword(), {
        old_password: d.old_password,
        new_password: d.new_password,
      }),
    onSuccess: () => {
      toast({ title: 'Password changed successfully', variant: 'success' })
      passwordForm.reset()
    },
    onError: (e: ApiError) => {
      applyServerErrors(passwordForm.setError, e.fieldErrors)
      toast({ title: e.message, variant: 'destructive' })
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-text-primary">Settings</h1>
        <p className="mt-0.5 text-sm text-text-secondary">Manage your account and preferences</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Sidebar nav */}
        <div className="lg:col-span-1">
          <Card className="p-2">
            <nav>
              {TABS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTab(t.value)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                    tab === t.value
                      ? 'bg-primary-light text-primary'
                      : 'text-text-secondary hover:bg-bg-subtle hover:text-text-primary'
                  )}
                >
                  {t.value === 'profile'    && <User    className="h-4 w-4 shrink-0" />}
                  {t.value === 'security'   && <Shield  className="h-4 w-4 shrink-0" />}
                  {t.value === 'appearance' && <Monitor className="h-4 w-4 shrink-0" />}
                  {t.label}
                </button>
              ))}
            </nav>
          </Card>
        </div>

        {/* Content */}
        <div className="lg:col-span-3 space-y-4">

          {/* ── Profile tab ─────────────────────────────────── */}
          {tab === 'profile' && (
            <>
              <Card>
                <div className="flex items-center gap-4">
                  <Avatar name={user?.full_name || user?.email} size="lg" />
                  <div>
                    <p className="font-semibold text-text-primary">
                      {user?.full_name || user?.email}
                    </p>
                    <p className="text-sm text-text-secondary">{user?.email}</p>
                    <div className="mt-1 flex gap-2">
                      {user?.is_staff && <Badge variant="info">Staff</Badge>}
                      {user?.is_email_verified
                        ? <Badge variant="success">Verified</Badge>
                        : <Badge variant="warning">Unverified</Badge>}
                    </div>
                  </div>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm">
                  <div>
                    <dt className="text-text-muted">Member since</dt>
                    <dd className="mt-0.5 font-medium text-text-primary">
                      {formatDate(user?.date_joined)}
                    </dd>
                  </div>
                </dl>
              </Card>

              <Card>
                <h2 className="text-sm font-semibold text-text-primary">Edit Profile</h2>
                <form
                  onSubmit={profileForm.handleSubmit((d) => profileMutation.mutate(d))}
                  className="mt-4 space-y-4"
                >
                  {profileForm.formState.errors.root && (
                    <div role="alert" className="rounded-lg border border-danger/20 bg-danger-subtle p-3 text-sm text-danger">
                      {profileForm.formState.errors.root.message}
                    </div>
                  )}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      label="First Name"
                      htmlFor="profile-first-name"
                      required
                      error={profileForm.formState.errors.first_name?.message}
                    >
                      <Input
                        id="profile-first-name"
                        {...profileForm.register('first_name')}
                      />
                    </FormField>
                    <FormField
                      label="Last Name"
                      htmlFor="profile-last-name"
                      required
                      error={profileForm.formState.errors.last_name?.message}
                    >
                      <Input
                        id="profile-last-name"
                        {...profileForm.register('last_name')}
                      />
                    </FormField>
                  </div>
                  <FormField
                    label="Phone Number"
                    htmlFor="profile-phone"
                    error={profileForm.formState.errors.phone_number?.message}
                  >
                    <Input
                      id="profile-phone"
                      type="tel"
                      placeholder="+1 555 000 0000"
                      {...profileForm.register('phone_number')}
                    />
                  </FormField>
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      size="sm"
                      isLoading={profileMutation.isPending}
                      loadingText="Saving…"
                    >
                      Save Changes
                    </Button>
                  </div>
                </form>
              </Card>
            </>
          )}

          {/* ── Security tab ─────────────────────────────────── */}
          {tab === 'security' && (
            <Card>
              <h2 className="text-sm font-semibold text-text-primary">Change Password</h2>
              <p className="mt-1 text-sm text-text-secondary">
                Choose a strong password you haven't used elsewhere.
              </p>
              <form
                onSubmit={passwordForm.handleSubmit((d) => passwordMutation.mutate(d))}
                className="mt-5 space-y-4"
              >
                {passwordForm.formState.errors.root && (
                  <div role="alert" className="rounded-lg border border-danger/20 bg-danger-subtle p-3 text-sm text-danger">
                    {passwordForm.formState.errors.root.message}
                  </div>
                )}
                <FormField
                  label="Current Password"
                  htmlFor="pwd-current"
                  required
                  error={passwordForm.formState.errors.old_password?.message}
                >
                  <Input
                    id="pwd-current"
                    type="password"
                    autoComplete="current-password"
                    {...passwordForm.register('old_password')}
                  />
                </FormField>
                <FormField
                  label="New Password"
                  htmlFor="pwd-new"
                  required
                  hint="Minimum 8 characters"
                  error={passwordForm.formState.errors.new_password?.message}
                >
                  <Input
                    id="pwd-new"
                    type="password"
                    autoComplete="new-password"
                    {...passwordForm.register('new_password')}
                  />
                </FormField>
                <FormField
                  label="Confirm New Password"
                  htmlFor="pwd-confirm"
                  required
                  error={passwordForm.formState.errors.confirm_password?.message}
                >
                  <Input
                    id="pwd-confirm"
                    type="password"
                    autoComplete="new-password"
                    {...passwordForm.register('confirm_password')}
                  />
                </FormField>
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    size="sm"
                    isLoading={passwordMutation.isPending}
                    loadingText="Updating…"
                  >
                    Update Password
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* ── Appearance tab ───────────────────────────────── */}
          {tab === 'appearance' && (
            <Card>
              <h2 className="text-sm font-semibold text-text-primary">Theme</h2>
              <p className="mt-1 text-sm text-text-secondary">
                Choose how the admin panel looks for you.
              </p>
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {THEME_OPTIONS.map(({ value, label, icon: Icon, description }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTheme(value)}
                    className={cn(
                      'flex flex-col items-center gap-3 rounded-xl border-2 p-5 text-center transition-all',
                      theme === value
                        ? 'border-primary bg-primary-light text-primary'
                        : 'border-border bg-surface text-text-secondary hover:border-border-strong hover:text-text-primary'
                    )}
                  >
                    <Icon className="h-6 w-6" aria-hidden />
                    <div>
                      <p className="font-semibold">{label}</p>
                      <p className="mt-0.5 text-xs text-text-muted">{description}</p>
                    </div>
                    {theme === value && (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                        Active
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <p className="mt-4 text-xs text-text-muted">Changes apply immediately.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
