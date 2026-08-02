import { type ReactNode } from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { cn } from '@/utils/cn'

interface TooltipProps {
  content: ReactNode
  children: ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  className?: string
}

/**
 * Accessible tooltip built on Radix. Used for icon-only controls
 * (collapsed sidebar, icon buttons) where the icon has no visible label.
 */
export function Tooltip({ content, children, side = 'top', align = 'center', className }: TooltipProps) {
  return (
    <TooltipPrimitive.Root delayDuration={150}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          align={align}
          sideOffset={6}
          className={cn(
            'z-[80] rounded-lg bg-text-primary px-2.5 py-1.5 text-xs font-medium text-text-inverse shadow-md',
            'data-[state=delayed-open]:animate-fade-in',
            className
          )}
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-text-primary" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}

export function TooltipProvider({ children, delayDuration = 150 }: { children: ReactNode; delayDuration?: number }) {
  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration}>
      {children}
    </TooltipPrimitive.Provider>
  )
}
