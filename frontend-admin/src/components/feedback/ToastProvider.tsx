import * as RadixToast from '@radix-ui/react-toast'
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react'
import { useToast, type ToastVariant } from '@/contexts/ToastContext'
import { cn } from '@/utils/cn'

const variantConfig: Record<ToastVariant, { icon: typeof CheckCircle; className: string }> = {
  success: { icon: CheckCircle, className: 'border-success/20 bg-success/5 text-success' },
  error: { icon: AlertCircle, className: 'border-danger/20 bg-danger-subtle text-danger' },
  warning: { icon: AlertTriangle, className: 'border-warning/20 bg-warning/5 text-warning' },
  info: { icon: Info, className: 'border-border bg-surface text-text-primary' },
}

export function ToastProvider() {
  const { toasts, dismiss } = useToast()

  return (
    <RadixToast.Provider swipeDirection="right">
      {toasts.map((toast) => {
        const config = variantConfig[toast.variant]
        const Icon = config.icon
        return (
          <RadixToast.Root
            key={toast.id}
            open
            onOpenChange={(open) => !open && dismiss(toast.id)}
            className={cn(
              'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border p-4 shadow-lg',
              'data-[state=open]:animate-fade-in',
              config.className
            )}
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <div className="flex-1 space-y-0.5">
              <RadixToast.Title className="text-body-sm font-semibold">{toast.title}</RadixToast.Title>
              {toast.description && (
                <RadixToast.Description className="text-body-sm opacity-80">
                  {toast.description}
                </RadixToast.Description>
              )}
            </div>
            <RadixToast.Close asChild>
              <button
                aria-label="Close notification"
                className="ml-auto shrink-0 rounded p-0.5 opacity-60 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:shadow-focus-ring"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </RadixToast.Close>
          </RadixToast.Root>
        )
      })}
      <RadixToast.Viewport className="fixed bottom-6 right-6 z-[100] flex max-h-screen w-full max-w-sm flex-col gap-2 p-0 outline-none" />
    </RadixToast.Provider>
  )
}