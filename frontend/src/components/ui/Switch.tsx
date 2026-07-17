import * as RadixSwitch from '@radix-ui/react-switch'
import { cn } from '@/utils/cn'

interface SwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label?: string
  id?: string
  disabled?: boolean
  className?: string
}

export function Switch({ checked, onCheckedChange, label, id, disabled, className }: SwitchProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <RadixSwitch.Root
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className={cn(
          'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent',
          'transition-colors',
          'focus-visible:outline-none focus-visible:shadow-focus-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          checked ? 'bg-accent' : 'bg-border'
        )}
      >
        <RadixSwitch.Thumb
          className={cn(
            'pointer-events-none block h-5 w-5 rounded-full bg-white shadow-sm',
            'transition-transform duration-200',
            checked ? 'translate-x-5' : 'translate-x-0'
          )}
        />
      </RadixSwitch.Root>
      {label && (
        <label htmlFor={id} className="text-body-sm text-text-primary cursor-pointer">
          {label}
        </label>
      )}
    </div>
  )
}
