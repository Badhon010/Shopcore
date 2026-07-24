import * as RadixSelect from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface SelectProps {
  options: SelectOption[]
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  error?: boolean
  id?: string
  className?: string
}

export function Select({
  options,
  value,
  onValueChange,
  placeholder = 'Select…',
  disabled,
  error,
  id,
  className,
}: SelectProps) {
  return (
    <RadixSelect.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <RadixSelect.Trigger
        id={id}
        aria-invalid={error ?? undefined}
        className={cn(
          'flex h-[52px] w-full items-center justify-between rounded-md border bg-bg px-4 py-2 text-body-sm',
          'text-text-primary placeholder:text-text-tertiary',
          'transition-colors',
          'focus-visible:outline-none focus-visible:shadow-focus-ring focus-visible:border-accent',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error ? 'border-danger' : 'border-border',
          className
        )}
      >
        <RadixSelect.Value placeholder={placeholder} />
        <RadixSelect.Icon>
          <ChevronDown className="h-4 w-4 text-text-tertiary" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>

      <RadixSelect.Portal>
        <RadixSelect.Content
          className={cn(
            'relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-lg border bg-surface shadow-md',
            'data-[state=open]:animate-fade-in'
          )}
          position="popper"
          sideOffset={4}
        >
          <RadixSelect.Viewport className="p-1">
            {options.map((option) => (
              <RadixSelect.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className={cn(
                  'relative flex cursor-pointer select-none items-center rounded-md py-2 pl-8 pr-3 text-body-sm',
                  'text-text-primary outline-none',
                  'data-[highlighted]:bg-accent-subtle data-[highlighted]:text-accent',
                  'data-[disabled]:pointer-events-none data-[disabled]:opacity-50'
                )}
              >
                <RadixSelect.ItemIndicator className="absolute left-2 flex items-center justify-center">
                  <Check className="h-3.5 w-3.5 text-accent" />
                </RadixSelect.ItemIndicator>
                <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  )
}
