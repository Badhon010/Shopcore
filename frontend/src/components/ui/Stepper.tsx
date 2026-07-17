import { Check } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface Step {
  label: string
  description?: string
}

interface StepperProps {
  steps: Step[]
  currentStep: number
  className?: string
}

export function Stepper({ steps, currentStep, className }: StepperProps) {
  return (
    <nav aria-label="Progress" className={cn('', className)}>
      <ol className="flex items-center">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep
          const isCurrent = index === currentStep

          return (
            <li
              key={step.label}
              className={cn('flex items-center', index < steps.length - 1 && 'flex-1')}
            >
              <div className="flex flex-col items-center">
                <div
                  aria-current={isCurrent ? 'step' : undefined}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-caption font-semibold transition-colors',
                    isCompleted
                      ? 'bg-accent text-text-inverse'
                      : isCurrent
                        ? 'border-2 border-accent text-accent'
                        : 'border-2 border-border text-text-tertiary'
                  )}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : <span>{index + 1}</span>}
                </div>
                <span
                  className={cn(
                    'mt-1 text-caption font-medium whitespace-nowrap',
                    isCurrent ? 'text-accent' : isCompleted ? 'text-text-secondary' : 'text-text-tertiary'
                  )}
                >
                  {step.label}
                </span>
              </div>

              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'mx-2 h-0.5 flex-1 transition-colors',
                    isCompleted ? 'bg-accent' : 'bg-border'
                  )}
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
