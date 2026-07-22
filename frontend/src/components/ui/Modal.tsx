import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'
import { IconButton } from './IconButton'
import type { ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className,
  size = 'md',
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-overlay/50 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-full -translate-x-1/2 -translate-y-1/2 rounded-xl bg-surface p-6 shadow-lg',
            'data-[state=open]:animate-fade-in',
            'focus:outline-none',
            sizeClasses[size],
            className
          )}
          aria-describedby={description ? 'modal-description' : undefined}
        >
          {title && (
            <Dialog.Title className="text-heading-md font-semibold text-text-primary">
              {title}
            </Dialog.Title>
          )}
          {description && (
            <Dialog.Description id="modal-description" className="mt-1 text-body-sm text-text-secondary">
              {description}
            </Dialog.Description>
          )}

          <Dialog.Close asChild>
            <IconButton
              label="Close dialog"
              size="sm"
              className="absolute right-4 top-4"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </IconButton>
          </Dialog.Close>

          <div className={cn(title || description ? 'mt-4' : '')}>{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
