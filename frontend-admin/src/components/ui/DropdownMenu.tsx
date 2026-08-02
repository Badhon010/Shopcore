import { type ComponentPropsWithoutRef, type ElementRef, forwardRef } from 'react'
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import { cn } from '@/utils/cn'

/**
 * Accessible dropdown menu built on Radix.
 * Usage:
 *   <DropdownMenu>
 *     <DropdownMenuTrigger>…</DropdownMenuTrigger>
 *     <DropdownMenuContent>…items…</DropdownMenuContent>
 *   </DropdownMenu>
 */

export const DropdownMenu = DropdownMenuPrimitive.Root
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger
export const DropdownMenuGroup = DropdownMenuPrimitive.Group
export const DropdownMenuSeparator = DropdownMenuPrimitive.Separator

export const DropdownMenuContent = forwardRef<
  ElementRef<typeof DropdownMenuPrimitive.Content>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 8, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-[70] min-w-[200px] overflow-hidden rounded-xl border border-border bg-surface p-1.5 shadow-lg',
        'data-[state=open]:animate-scale-in data-[state=closed]:animate-fade-out',
        className
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
))
DropdownMenuContent.displayName = 'DropdownMenuContent'

export const DropdownMenuItem = forwardRef<
  ElementRef<typeof DropdownMenuPrimitive.Item>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & { destructive?: boolean }
>(({ className, destructive, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex cursor-pointer select-none items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-text-secondary outline-none transition-colors',
      'focus-visible:bg-bg-subtle focus-visible:text-text-primary',
      'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      destructive && 'text-danger focus-visible:bg-danger-subtle focus-visible:text-danger',
      className
    )}
    {...props}
  />
))
DropdownMenuItem.displayName = 'DropdownMenuItem'

export const DropdownMenuLabel = forwardRef<
  ElementRef<typeof DropdownMenuPrimitive.Label>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn('px-2.5 py-2 text-xs font-semibold uppercase tracking-wider text-text-muted', className)}
    {...props}
  />
))
DropdownMenuLabel.displayName = 'DropdownMenuLabel'

