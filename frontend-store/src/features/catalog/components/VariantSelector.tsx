import { cn } from '@/utils/cn'
import type { ProductVariant } from '@/types/models'

interface VariantSelectorProps {
  variants: ProductVariant[]
  selectedVariant: ProductVariant | null
  onSelect: (variant: ProductVariant) => void
}

export function VariantSelector({ variants, selectedVariant, onSelect }: VariantSelectorProps) {
  if (!variants.length) return null

  // Group options by name (e.g. "Size", "Color")
  const optionNames = [...new Set(variants.flatMap((v) => v.options.map((o) => o.name)))]

  return (
    <div className="space-y-4">
      {optionNames.map((optionName) => {
        const optionValues = [
          ...new Set(
            variants
              .flatMap((v) => v.options)
              .filter((o) => o.name === optionName)
              .map((o) => o.value)
          ),
        ]

        return (
          <div key={optionName}>
            <p className="mb-2 text-body-sm font-medium text-text-primary">
              {optionName}:{' '}
              <span className="font-normal text-text-secondary">
                {selectedVariant?.options.find((o) => o.name === optionName)?.value ?? '—'}
              </span>
            </p>
            <div
              role="radiogroup"
              aria-label={optionName}
              className="flex flex-wrap gap-2"
            >
              {optionValues.map((value) => {
                const matchingVariant = variants.find((v) =>
                  v.options.some((o) => o.name === optionName && o.value === value)
                )
                const isSelected = selectedVariant?.options.some(
                  (o) => o.name === optionName && o.value === value
                )
                const isAvailable = matchingVariant?.is_available ?? true

                return (
                  <button
                    key={value}
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={`${optionName}: ${value}${!isAvailable ? ' (Out of stock)' : ''}`}
                    disabled={!isAvailable}
                    onClick={() => matchingVariant && onSelect(matchingVariant)}
                    className={cn(
                      'relative flex min-w-[2.5rem] items-center justify-center rounded-md border px-3 py-1.5 text-body-sm font-medium transition-all',
                      'focus-visible:outline-none focus-visible:shadow-focus-ring',
                      'disabled:cursor-not-allowed disabled:opacity-50',
                      isSelected
                        ? 'border-accent bg-accent text-text-inverse'
                        : 'border-border bg-bg text-text-primary hover:border-accent-hover',
                      !isAvailable && 'line-through'
                    )}
                  >
                    {value}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
