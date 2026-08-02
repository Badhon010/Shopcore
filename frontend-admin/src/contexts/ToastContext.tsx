import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react'
import * as RadixToast from '@radix-ui/react-toast'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { cn } from '@/utils/cn'

export type ToastVariant = 'success' | 'destructive' | 'warning' | 'info' | 'default'

export interface ToastData {
  id: string
  title: string
  description?: string
  variant?: ToastVariant
}

interface ToastContextValue {
  toast: (data: Omit<ToastData, 'id'>) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const VARIANT_STYLES: Record<ToastVariant, string> = {
  success:     'border-success/30 bg-success-subtle text-success',
  destructive: 'border-danger/30 bg-danger-subtle text-danger',
  warning:     'border-warning/30 bg-warning-subtle text-warning',
  info:        'border-info/30 bg-info-subtle text-info',
  default:     'border-border bg-surface text-text-primary',
}

const VARIANT_ICONS: Record<ToastVariant, typeof CheckCircle | null> = {
  success:     CheckCircle,
  destructive: AlertCircle,
  warning:     AlertTriangle,
  info:        Info,
  default:     null,
}

function ToastItem({ item, onClose }: { item: ToastData; onClose: () => void }) {
  const variant = item.variant ?? 'default'
  const Icon = VARIANT_ICONS[variant]

  return (
    <RadixToast.Root
      className={cn(
        'pointer-events-auto flex w-[360px] items-start gap-3 rounded-xl border p-4 shadow-md',
        'data-[state=open]:animate-scale-in data-[state=closed]:animate-fade-out',
        VARIANT_STYLES[variant]
      )}
      duration={4000}
      onOpenChange={(open) => { if (!open) onClose() }}
    >
      {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0" />}
      <div className="min-w-0 flex-1">
        <RadixToast.Title className="text-sm font-semibold leading-tight text-text-primary">
          {item.title}
        </RadixToast.Title>
        {item.description && (
          <RadixToast.Description className="mt-1 text-sm text-text-secondary">
            {item.description}
          </RadixToast.Description>
        )}
      </div>
      <RadixToast.Close
        onClick={onClose}
        className="shrink-0 rounded-md p-1 opacity-60 transition-opacity hover:opacity-100 focus-visible:shadow-focus-ring"
        aria-label="Close notification"
      >
        <X className="h-3.5 w-3.5" />
      </RadixToast.Close>
    </RadixToast.Root>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([])

  const toast = useCallback((data: Omit<ToastData, 'id'>) => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { ...data, id }])
  }, [])

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      <RadixToast.Provider swipeDirection="right">
        {children}
        {toasts.map((item) => (
          <ToastItem key={item.id} item={item} onClose={() => remove(item.id)} />
        ))}
        <RadixToast.Viewport className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2" />
      </RadixToast.Provider>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
