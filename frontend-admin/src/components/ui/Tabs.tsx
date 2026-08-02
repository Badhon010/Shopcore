import { type ReactNode } from 'react'
import * as RadixTabs from '@radix-ui/react-tabs'
import { cn } from '@/utils/cn'

interface Tab {
  value: string
  label: string
  count?: number
}

interface TabsProps {
  tabs: Tab[]
  value: string
  onValueChange: (value: string) => void
  children?: ReactNode
  className?: string
}

export function Tabs({ tabs, value, onValueChange, children, className }: TabsProps) {
  return (
    <RadixTabs.Root value={value} onValueChange={onValueChange}>
      <RadixTabs.List
        className={cn(
          'flex items-center gap-1 border-b border-border',
          className
        )}
      >
        {tabs.map((tab) => (
          <RadixTabs.Trigger
            key={tab.value}
            value={tab.value}
            className={cn(
              'relative flex items-center gap-1.5 px-4 pb-3 pt-3 text-sm font-medium text-text-muted transition-colors',
              'hover:text-text-primary focus-visible:outline-none focus-visible:text-text-primary',
              'data-[state=active]:text-text-primary',
              'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-full after:bg-primary after:scale-x-0 after:transition-transform',
              'data-[state=active]:after:scale-x-100'
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={cn(
                'rounded-full px-1.5 py-0.5 text-xs font-medium',
                'bg-secondary text-secondary-foreground'
              )}>
                {tab.count}
              </span>
            )}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      {children}
    </RadixTabs.Root>
  )
}

export const TabContent = RadixTabs.Content
