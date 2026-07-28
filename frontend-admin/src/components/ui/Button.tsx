import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/utils/cn'
import { Spinner } from '@/components/feedback/Spinner'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-medium transition-all focus-visible:outline-none focus-visible:shadow-focus-ring disabled:pointer-events-none disabled:opacity-50 select-none',
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active active:scale-[0.98] rounded-lg',
        secondary:
          'bg-surface border border-border text-text-primary hover:bg-bg-subtle hover:border-border-strong active:scale-[0.98] rounded-lg',
        ghost:
          'text-text-secondary hover:bg-bg-subtle hover:text-text-primary active:scale-[0.98] rounded-lg',
        destructive:
          'bg-danger text-danger-foreground hover:bg-danger/90 active:scale-[0.98] rounded-lg',
        link: 'text-primary underline-offset-4 hover:underline p-0 h-auto rounded-none',
      },
      size: {
        sm:      'h-8 px-3 text-xs',
        md:      'h-9 px-4 text-sm',
        lg:      'h-10 px-5 text-sm font-semibold',
        'icon-sm': 'h-7 w-7 p-0 rounded-md',
        'icon-md': 'h-9 w-9 p-0',
        'icon-lg': 'h-10 w-10 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
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
        {asChild ? children : isLoading ? (
          <>
            <Spinner size="sm" className="shrink-0" />
            {loadingText ?? children}
          </>
        ) : children}
      </Comp>
    )
  }
)
Button.displayName = 'Button'
export { buttonVariants }
