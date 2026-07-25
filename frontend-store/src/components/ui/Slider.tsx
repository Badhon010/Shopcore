import * as RadixSlider from '@radix-ui/react-slider'
import { cn } from '@/utils/cn'

interface SliderProps {
  value: [number, number]
  onValueChange: (value: [number, number]) => void
  onValueCommit?: (value: [number, number]) => void
  min: number
  max: number
  step?: number
  className?: string
  'aria-label'?: string
}

export function Slider({
  value,
  onValueChange,
  onValueCommit,
  min,
  max,
  step = 1,
  className,
  'aria-label': ariaLabel,
}: SliderProps) {
  return (
    <RadixSlider.Root
      className={cn('relative flex w-full touch-none select-none items-center', className)}
      value={value}
      onValueChange={onValueChange}
      onValueCommit={onValueCommit}
      min={min}
      max={max}
      step={step}
      aria-label={ariaLabel}
    >
      <RadixSlider.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-border">
        <RadixSlider.Range className="absolute h-full bg-accent" />
      </RadixSlider.Track>
      {value.map((_, i) => (
        <RadixSlider.Thumb
          key={i}
          className={cn(
            'block h-5 w-5 rounded-full border-2 border-accent bg-surface shadow-sm',
            'transition-colors',
            'focus-visible:outline-none focus-visible:shadow-focus-ring',
            'disabled:pointer-events-none disabled:opacity-50'
          )}
        />
      ))}
    </RadixSlider.Root>
  )
}
