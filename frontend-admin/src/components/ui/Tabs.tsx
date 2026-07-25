import { cn } from '@/utils/cn'
import type { ReactNode } from 'react'

export interface Tab {
  value: string
  label: string
  count?: number
}

interface TabsProps {
  tabs: Tab[]
  value: string
  onChange: (value: string) => void
  className?: string
}

export function Tabs({ tabs, value, onChange, className }: TabsProps) {
  return (
    <div
      role="tablist"
      className={cn(
        'flex gap-0 border-b border-border',
        className
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.value}
          role="tab"
          aria-selected={value === tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            'flex items-center gap-2 px-4 py-3 text-body-sm font-medium transition-colors',
            'border-b-2 -mb-px',
            value === tab.value
              ? 'border-primary text-primary'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                value === tab.value
                  ? 'bg-primary-light text-primary'
                  : 'bg-bg-subtle text-text-muted'
              )}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

interface TabContentProps {
  value: string
  activeValue: string
  children: ReactNode
}

export function TabContent({ value, activeValue, children }: TabContentProps) {
  if (value !== activeValue) return null
  return <div role="tabpanel">{children}</div>
}
