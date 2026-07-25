import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'
import { IconButton } from '@/components/ui/IconButton'
import type { ReactNode } from 'react'

export interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  children: ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizeMap = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

export function Modal({ open, onOpenChange, title, description, children, className, size = 'md' }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-overlay/60 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2',
            'rounded-xl bg-surface shadow-lg focus:outline-none',
            'data-[state=open]:animate-fade-in',
            sizeMap[size],
            className
          )}
        >
          {(title || description) && (
            <div className="flex items-start justify-between border-b border-border px-6 py-5">
              <div>
                {title && (
                  <Dialog.Title className="text-heading-sm font-semibold text-text-primary">
                    {title}
                  </Dialog.Title>
                )}
                {description && (
                  <Dialog.Description className="mt-1 text-body-sm text-text-secondary">
                    {description}
                  </Dialog.Description>
                )}
              </div>
              <Dialog.Close asChild>
                <IconButton label="Close" size="sm" className="ml-4 shrink-0">
                  <X className="h-4 w-4" />
                </IconButton>
              </Dialog.Close>
            </div>
          )}
          <div className="px-6 py-5">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
