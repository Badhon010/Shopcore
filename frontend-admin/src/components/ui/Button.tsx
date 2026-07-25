import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/utils/cn'
import { Spinner } from '@/components/feedback/Spinner'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all focus-visible:outline-none focus-visible:shadow-focus-ring disabled:pointer-events-none disabled:opacity-50 select-none',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-text-inverse hover:bg-accent-hover active:scale-[0.98]',
        secondary: 'border border-border bg-surface text-text-primary hover:bg-bg-subtle active:scale-[0.98]',
        ghost: 'text-text-secondary hover:bg-bg-subtle hover:text-text-primary active:scale-[0.98]',
        destructive: 'bg-danger text-danger-foreground hover:bg-danger/90 active:scale-[0.98]',
        link: 'text-accent underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-10 rounded-md px-4 text-body-sm',
        md: 'h-12 px-5 text-body-md',
        lg: 'h-[52px] px-6 text-body-md font-semibold',
        'icon-sm': 'h-9 w-9 p-0',
        'icon-md': 'h-11 w-11 p-0',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean
  loadingText?: string
  asChild?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, loadingText, children, disabled, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        {...props}
      >
        {asChild ? children : isLoading ? <><Spinner size="sm" />{loadingText ?? children}</> : children}
      </Comp>
    )
  }
)
Button.displayName = 'Button'