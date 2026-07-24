import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      screens: {
        xs: '480px',
        '3xl': '1920px',
      },
      colors: {
        // ── Backgrounds ─────────────────────────────────────────
        bg:               'hsl(var(--background) / <alpha-value>)',
        'bg-subtle':      'hsl(var(--background-subtle) / <alpha-value>)',
        background:       'hsl(var(--background) / <alpha-value>)',
        'background-subtle': 'hsl(var(--background-subtle) / <alpha-value>)',

        // ── Surfaces ─────────────────────────────────────────────
        surface:          'hsl(var(--surface) / <alpha-value>)',
        'surface-raised': 'hsl(var(--surface-elevated) / <alpha-value>)',  // backward compat
        'surface-elevated': 'hsl(var(--surface-elevated) / <alpha-value>)',

        // ── Borders ──────────────────────────────────────────────
        border:           'hsl(var(--border) / <alpha-value>)',
        'border-light':   'hsl(var(--border-light) / <alpha-value>)',
        'border-strong':  'hsl(var(--border-strong) / <alpha-value>)',

        // ── Text ─────────────────────────────────────────────────
        'text-primary':   'hsl(var(--text-primary) / <alpha-value>)',
        'text-secondary': 'hsl(var(--text-secondary) / <alpha-value>)',
        'text-tertiary':  'hsl(var(--text-muted) / <alpha-value>)',    // backward compat
        'text-muted':     'hsl(var(--text-muted) / <alpha-value>)',
        'text-inverse':   'hsl(var(--text-inverse) / <alpha-value>)',
        'text-on-primary':'hsl(var(--text-on-primary) / <alpha-value>)',

        // ── Primary / Brand ──────────────────────────────────────
        primary:              'hsl(var(--primary) / <alpha-value>)',
        'primary-hover':      'hsl(var(--primary-hover) / <alpha-value>)',
        'primary-active':     'hsl(var(--primary-active) / <alpha-value>)',
        'primary-light':      'hsl(var(--primary-light) / <alpha-value>)',
        'primary-foreground': 'hsl(var(--primary-foreground) / <alpha-value>)',

        // ── Accent (backward compat — maps to primary) ───────────
        accent:           'hsl(var(--primary) / <alpha-value>)',
        'accent-hover':   'hsl(var(--primary-hover) / <alpha-value>)',
        'accent-subtle':  'hsl(var(--primary-light) / <alpha-value>)',
        'accent-foreground': 'hsl(var(--primary-foreground) / <alpha-value>)',

        // ── True accent (orange/amber from --accent token) ───────
        // Use these for sale badges, promo banners, tags, highlights.
        // The `accent` aliases above stay blue for backward compat.
        'tw-accent':            'hsl(var(--accent) / <alpha-value>)',
        'tw-accent-hover':      'hsl(var(--accent-hover) / <alpha-value>)',
        'tw-accent-subtle':     'hsl(var(--accent-subtle) / <alpha-value>)',
        'tw-accent-foreground': 'hsl(var(--accent-foreground) / <alpha-value>)',

        // ── Secondary ────────────────────────────────────────────
        secondary:            'hsl(var(--secondary) / <alpha-value>)',
        'secondary-hover':    'hsl(var(--secondary-hover) / <alpha-value>)',
        'secondary-foreground': 'hsl(var(--secondary-foreground) / <alpha-value>)',

        // ── Status ───────────────────────────────────────────────
        success:              'hsl(var(--success) / <alpha-value>)',
        'success-subtle':     'hsl(var(--success-subtle) / <alpha-value>)',
        'success-foreground': 'hsl(var(--success-foreground) / <alpha-value>)',

        warning:              'hsl(var(--warning) / <alpha-value>)',
        'warning-subtle':     'hsl(var(--warning-subtle) / <alpha-value>)',
        'warning-foreground': 'hsl(var(--warning-foreground) / <alpha-value>)',

        danger:               'hsl(var(--danger) / <alpha-value>)',
        'danger-subtle':      'hsl(var(--danger-subtle) / <alpha-value>)',
        'danger-foreground':  'hsl(var(--danger-foreground) / <alpha-value>)',

        info:                 'hsl(var(--info) / <alpha-value>)',
        'info-subtle':        'hsl(var(--info-subtle) / <alpha-value>)',
        'info-foreground':    'hsl(var(--info-foreground) / <alpha-value>)',

        // ── Special ──────────────────────────────────────────────
        overlay:              'hsl(var(--overlay) / <alpha-value>)',
        disabled:             'hsl(var(--disabled) / <alpha-value>)',
        'disabled-foreground': 'hsl(var(--disabled-foreground) / <alpha-value>)',
        skeleton:             'hsl(var(--skeleton) / <alpha-value>)',
      },

      // ── Typography Scale ──────────────────────────────────────
      fontSize: {
        // Display
        'display-2xl': ['4.5rem',  { lineHeight: '1.05', letterSpacing: '-0.02em' }],
        'display-xl':  ['3.5rem',  { lineHeight: '1.08', letterSpacing: '-0.02em' }],
        'display-lg':  ['3rem',    { lineHeight: '1.1',  letterSpacing: '-0.015em' }],
        // Headings
        'heading-xl':  ['2.25rem', { lineHeight: '1.2',  letterSpacing: '-0.01em' }],
        'heading-lg':  ['1.75rem', { lineHeight: '1.25' }],
        'heading-md':  ['1.375rem',{ lineHeight: '1.3' }],
        'heading-sm':  ['1.25rem', { lineHeight: '1.35' }],
        // Body
        'body-lg':     ['1.125rem',{ lineHeight: '1.6' }],
        'body-md':     ['1rem',    { lineHeight: '1.6' }],
        'body-sm':     ['0.875rem',{ lineHeight: '1.5' }],
        // Utility
        caption:       ['0.75rem', { lineHeight: '1.4', letterSpacing: '0.02em' }],
        overline:      ['0.6875rem',{ lineHeight: '1.4', letterSpacing: '0.08em' }],
        label:         ['0.8125rem',{ lineHeight: '1.4', letterSpacing: '0.01em' }],
      },

      // ── Spacing ───────────────────────────────────────────────
      spacing: {
        18: '4.5rem',
        22: '5.5rem',
      },

      // ── Max Width ─────────────────────────────────────────────
      maxWidth: {
        '8xl': '1440px',
      },

      // ── Border Radius ─────────────────────────────────────────
      borderRadius: {
        sm:   'var(--radius-sm)',
        md:   'var(--radius-md)',
        lg:   'var(--radius-lg)',
        xl:   'var(--radius-xl)',
        '2xl':'var(--radius-2xl)',
        full: 'var(--radius-full)',
      },

      // ── Shadows ───────────────────────────────────────────────
      boxShadow: {
        xs:          'var(--shadow-xs)',
        sm:          'var(--shadow-sm)',
        md:          'var(--shadow-md)',
        lg:          'var(--shadow-lg)',
        'focus-ring':'var(--shadow-focus-ring)',
      },

      // ── Font Family ───────────────────────────────────────────
      fontFamily: {
        sans: ['InterVariable', 'Inter', 'system-ui', 'sans-serif'],
      },

      // ── Container ─────────────────────────────────────────────
      container: {
        center: true,
        padding: {
          DEFAULT: '1rem',
          sm:  '1.5rem',
          lg:  '2rem',
          xl:  '2.5rem',
          '2xl': '3rem',
        },
      },

      // ── Keyframes ─────────────────────────────────────────────
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'fade-out': {
          from: { opacity: '1' },
          to:   { opacity: '0' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-right': {
          from: { transform: 'translateX(100%)' },
          to:   { transform: 'translateX(0)' },
        },
        'slide-in-left': {
          from: { transform: 'translateX(-100%)' },
          to:   { transform: 'translateX(0)' },
        },
        'slide-in-bottom': {
          from: { transform: 'translateY(100%)' },
          to:   { transform: 'translateY(0)' },
        },
        'slide-in-top': {
          from: { transform: 'translateY(-100%)' },
          to:   { transform: 'translateY(0)' },
        },
        'accordion-down': {
          from: { height: '0', opacity: '0' },
          to:   { height: 'var(--radix-accordion-content-height)', opacity: '1' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)', opacity: '1' },
          to:   { height: '0', opacity: '0' },
        },
      },

      // ── Animation Presets ─────────────────────────────────────
      animation: {
        shimmer:          'shimmer 2s linear infinite',
        'fade-in':        'fade-in var(--duration-base) ease-out',
        'fade-out':       'fade-out var(--duration-base) ease-in',
        'scale-in':       'scale-in var(--duration-base) cubic-bezier(0.2, 0, 0, 1)',
        'slide-in-right': 'slide-in-right var(--duration-slow) cubic-bezier(0.2, 0, 0, 1)',
        'slide-in-left':  'slide-in-left  var(--duration-slow) cubic-bezier(0.2, 0, 0, 1)',
        'slide-in-bottom':'slide-in-bottom var(--duration-slow) cubic-bezier(0.2, 0, 0, 1)',
        'slide-in-top':      'slide-in-top   var(--duration-slow) cubic-bezier(0.2, 0, 0, 1)',
        'accordion-down':    'accordion-down 200ms cubic-bezier(0.2, 0, 0, 1)',
        'accordion-up':      'accordion-up   200ms cubic-bezier(0.2, 0, 0, 1)',
      },
    },
  },
  plugins: [],
}

export default config
