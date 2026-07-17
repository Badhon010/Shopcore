import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Switch } from '@/components/ui/Switch'
import { Modal } from '@/components/ui/Modal'
import { authService } from '@/services/api/auth.service'
import { useToast } from '@/contexts/ToastContext'
import { useTheme } from '@/contexts/ThemeContext'
import { applyServerErrors } from '@/services/api/axiosClient'
import type { ApiError } from '@/types/api'

const changePasswordSchema = z.object({
  old_password: z.string().min(1, 'Required'),
  new_password: z.string().min(8, 'Min 8 characters'),
  new_password_confirm: z.string().min(1, 'Required'),
}).refine(d => d.new_password === d.new_password_confirm, { message: 'Passwords do not match', path: ['new_password_confirm'] })

type ChangePasswordData = z.infer<typeof changePasswordSchema>

export function SettingsPage() {
  const { toast } = useToast()
  const { theme, setTheme } = useTheme()
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')

  const changePw = useMutation({
    mutationFn: (data: ChangePasswordData) => authService.changePassword(data),
    onSuccess: () => toast({ title: 'Password changed', variant: 'success' }),
  })

  const form = useForm<ChangePasswordData>({
    resolver: zodResolver(changePasswordSchema),
  })

  const onSubmit = async (data: ChangePasswordData) => {
    try {
      await changePw.mutateAsync(data)
      form.reset()
    } catch (err) {
      applyServerErrors(form.setError, (err as ApiError).fieldErrors)
    }
  }

  return (
    <>
      <Helmet>
        <title>Settings — ShopCore</title>
      </Helmet>
      <div className="space-y-10">
        <h1 className="text-heading-lg font-semibold text-text-primary">Settings</h1>

        {/* Theme */}
        <section>
          <h2 className="text-heading-sm font-semibold text-text-primary mb-4">Appearance</h2>
          <div className="flex items-center justify-between rounded-xl border border-border p-4">
            <div>
              <p className="text-body-sm font-medium text-text-primary">Theme</p>
              <p className="text-caption text-text-tertiary">Choose your preferred color scheme</p>
            </div>
            <div className="flex gap-2">
              {(['light', 'dark', 'system'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`rounded-lg px-3 py-1.5 text-body-sm font-medium capitalize transition-colors focus-visible:outline-none focus-visible:shadow-focus-ring ${
                    theme === t ? 'bg-accent text-text-inverse' : 'border border-border text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Change password */}
        <section>
          <h2 className="text-heading-sm font-semibold text-text-primary mb-4">Change password</h2>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="max-w-md space-y-4">
            <FormField label="Current password" required error={form.formState.errors.old_password?.message}>
              {(id) => <Input id={id} type="password" {...form.register('old_password')} error={!!form.formState.errors.old_password} />}
            </FormField>
            <FormField label="New password" required error={form.formState.errors.new_password?.message}>
              {(id) => <Input id={id} type="password" {...form.register('new_password')} error={!!form.formState.errors.new_password} />}
            </FormField>
            <FormField label="Confirm new password" required error={form.formState.errors.new_password_confirm?.message}>
              {(id) => <Input id={id} type="password" {...form.register('new_password_confirm')} error={!!form.formState.errors.new_password_confirm} />}
            </FormField>
            <Button type="submit" isLoading={changePw.isPending}>Update password</Button>
          </form>
        </section>

        {/* Danger zone */}
        <section>
          <h2 className="text-heading-sm font-semibold text-text-primary mb-4">Danger zone</h2>
          <div className="rounded-xl border border-danger/20 bg-danger-subtle p-4 flex items-center justify-between">
            <div>
              <p className="text-body-sm font-semibold text-danger">Delete account</p>
              <p className="text-caption text-text-secondary">Permanently delete your account and all data.</p>
            </div>
            <Button variant="destructive" size="sm" onClick={() => setDeleteModalOpen(true)}>
              Delete account
            </Button>
          </div>
        </section>
      </div>

      <Modal
        open={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setDeleteConfirmation('') }}
        title="Delete your account"
        description='This action is permanent and cannot be undone. Type "DELETE" to confirm.'
      >
        <div className="mt-4 space-y-4">
          <Input
            value={deleteConfirmation}
            onChange={(e) => setDeleteConfirmation(e.target.value)}
            placeholder='Type "DELETE" to confirm'
          />
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteConfirmation !== 'DELETE'}
              onClick={() => toast({ title: 'Account deletion requested. Our team will process it shortly.', variant: 'info' })}
            >
              Delete my account
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
