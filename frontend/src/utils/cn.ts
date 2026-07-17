import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// The default tailwind-merge config only recognizes Tailwind's built-in
// font-size scale (text-xs, text-sm, text-base, text-lg, text-2xl, ...).
// This project's tailwind.config.ts defines custom named sizes instead
// (text-body-md, text-heading-lg, text-display-xl, text-caption, ...).
// Without registering them here, tailwind-merge falls back to treating
// those unrecognized "text-*" classes as text-color utilities, which makes
// it think e.g. "text-text-inverse" (a real color) conflicts with
// "text-body-md" (a size) and silently drops the color — leaving button
// text the same color as its background. Register the custom scale so
// color and size utilities are merged independently.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
            'display-2xl',
            'display-xl',
            'display-lg',
            'heading-xl',
            'heading-lg',
            'heading-md',
            'heading-sm',
            'body-lg',
            'body-md',
            'body-sm',
            'caption',
          ],
        },
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
