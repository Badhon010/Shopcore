import * as RadixTabs from '@radix-ui/react-tabs'
import { cn } from '@/utils/cn'
import type { ReactNode } from 'react'

export interface TabItem {
  value: string
  label: string
  content: ReactNode
}

interface TabsProps {
  items: TabItem[]
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  className?: string
}

export function Tabs({ items, defaultValue, value, onValueChange, className }: TabsProps) {
  return (
    <RadixTabs.Root
      defaultValue={defaultValue ?? items[0]?.value}
      value={value}
      onValueChange={onValueChange}
      className={cn('w-full', className)}
    >
      <RadixTabs.List className="flex gap-1 border-b border-border">
        {items.map((item) => (
          <RadixTabs.Trigger
            key={item.value}
            value={item.value}
            className={cn(
              'px-4 py-2.5 text-body-sm font-medium text-text-secondary transition-colors',
              'border-b-2 border-transparent -mb-px',
              'hover:text-text-primary',
              'focus-visible:outline-none focus-visible:shadow-focus-ring rounded-t-sm',
              'data-[state=active]:border-accent data-[state=active]:text-accent'
            )}
          >
            {item.label}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      {items.map((item) => (
        <RadixTabs.Content
          key={item.value}
          value={item.value}
          className="mt-4 focus-visible:outline-none"
        >
          {item.content}
        </RadixTabs.Content>
      ))}
    </RadixTabs.Root>
  )
}
