import * as RadixAccordion from '@radix-ui/react-accordion'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { ReactNode } from 'react'

export interface AccordionItem {
  value: string
  trigger: ReactNode
  content: ReactNode
}

interface AccordionProps {
  items: AccordionItem[]
  type?: 'single' | 'multiple'
  className?: string
}

export function Accordion({ items, type = 'single', className }: AccordionProps) {
  return (
    <RadixAccordion.Root
      type={type}
      collapsible={type === 'single' ? true : undefined}
      className={cn('divide-y divide-border', className)}
    >
      {items.map((item) => (
        <RadixAccordion.Item key={item.value} value={item.value}>
          <RadixAccordion.Header>
            <RadixAccordion.Trigger
              className={cn(
                'flex w-full items-center justify-between py-4 text-body-md font-medium text-text-primary',
                'transition-colors hover:text-accent',
                'focus-visible:outline-none focus-visible:shadow-focus-ring rounded',
                '[&[data-state=open]>svg]:rotate-180'
              )}
            >
              {item.trigger}
              <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
            </RadixAccordion.Trigger>
          </RadixAccordion.Header>
          <RadixAccordion.Content className="overflow-hidden data-[state=open]:overflow-visible data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
            <div className="pb-4 text-body-sm text-text-secondary">{item.content}</div>
          </RadixAccordion.Content>
        </RadixAccordion.Item>
      ))}
    </RadixAccordion.Root>
  )
}
