import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import type { ReactNode } from 'react'

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'destructive' | 'primary'
  isLoading?: boolean
  onConfirm: () => void
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'destructive',
  isLoading,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title} size="sm">
      {description && (
        <p className="mb-6 text-body-sm text-text-secondary">{description}</p>
      )}
      <div className="flex justify-end gap-3">
        <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)} disabled={isLoading}>
          {cancelLabel}
        </Button>
        <Button
          variant={variant === 'destructive' ? 'destructive' : 'primary'}
          size="sm"
          isLoading={isLoading}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
