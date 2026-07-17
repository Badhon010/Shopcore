import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'
import { IconButton } from './IconButton'
import type { ReactNode } from 'react'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  side?: 'left' | 'right' | 'bottom'
  className?: string
}

const sideClasses = {
  right: 'right-0 top-0 h-full w-full max-w-md animate-slide-in-right',
  left:  'left-0 top-0 h-full w-full max-w-md animate-slide-in-right',
  bottom: 'bottom-0 left-0 right-0 rounded-t-xl animate-slide-in-bottom max-h-[90vh]',
}

export function Drawer({ open, onClose, title, children, side = 'right', className }: DrawerProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <Dialog.Content
          className={cn(
            'fixed z-50 bg-surface shadow-2xl focus:outline-none',
            'flex flex-col',          /* ← key: makes flex-1 children work */
            sideClasses[side],
            className
          )}
        >
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
            {title && (
              <Dialog.Title className="text-heading-sm font-semibold text-text-primary">
                {title}
              </Dialog.Title>
            )}
            <Dialog.Close asChild>
              <IconButton label="Close panel" size="sm" className="ml-auto" onClick={onClose}>
                <X className="h-4 w-4" />
              </IconButton>
            </Dialog.Close>
          </div>

          {/* Body — flex-1 + min-h-0 so children can control their own overflow */}
          <div className={cn(
            'flex-1 min-h-0',
            side === 'bottom' && 'overflow-y-auto',
          )}>
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
