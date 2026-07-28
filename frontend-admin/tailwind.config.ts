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
        bg:                  'hsl(var(--background) / <alpha-value>)',
        'bg-subtle':         'hsl(var(--background-subtle) / <alpha-value>)',
        background:          'hsl(var(--background) / <alpha-value>)',
        'background-subtle': 'hsl(var(--background-subtle) / <alpha-value>)',

        // ── Surfaces ─────────────────────────────────────────────
        surface:             'hsl(var(--surface) / <alpha-value>)',
        'surface-elevated':  'hsl(var(--surface-elevated) / <alpha-value>)',

        // ── Borders ──────────────────────────────────────────────
        border:              'hsl(var(--border) / <alpha-value>)',
        'border-light':      'hsl(var(--border-light) / <alpha-value>)',
        'border-strong':     'hsl(var(--border-strong) / <alpha-value>)',

        // ── Text ─────────────────────────────────────────────────
        'text-primary':      'hsl(var(--text-primary) / <alpha-value>)',
        'text-secondary':    'hsl(var(--text-secondary) / <alpha-value>)',
        'text-muted':        'hsl(var(--text-muted) / <alpha-value>)',
        'text-tertiary':     'hsl(var(--text-muted) / <alpha-value>)',
        'text-inverse':      'hsl(var(--text-inverse) / <alpha-value>)',
        'text-on-primary':   'hsl(var(--text-on-primary) / <alpha-value>)',

        // ── Primary / Brand ──────────────────────────────────────
        primary:              'hsl(var(--primary) / <alpha-value>)',
        'primary-hover':      'hsl(var(--primary-hover) / <alpha-value>)',
        'primary-active':     'hsl(var(--primary-active) / <alpha-value>)',
        'primary-light':      'hsl(var(--primary-light) / <alpha-value>)',
        'primary-foreground': 'hsl(var(--primary-foreground) / <alpha-value>)',

        // ── Accent ───────────────────────────────────────────────
        accent:              'hsl(var(--accent) / <alpha-value>)',
        'accent-hover':      'hsl(var(--accent-hover) / <alpha-value>)',
        'accent-subtle':     'hsl(var(--accent-subtle) / <alpha-value>)',
        'accent-foreground': 'hsl(var(--accent-foreground) / <alpha-value>)',

        // ── Secondary ────────────────────────────────────────────
        secondary:              'hsl(var(--secondary) / <alpha-value>)',
        'secondary-hover':      'hsl(var(--secondary-hover) / <alpha-value>)',
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

        // ── State ────────────────────────────────────────────────
        disabled:             'hsl(var(--disabled) / <alpha-value>)',
        'disabled-foreground':'hsl(var(--disabled-foreground) / <alpha-value>)',
        skeleton:             'hsl(var(--skeleton) / <alpha-value>)',
        overlay:              'hsl(var(--overlay) / <alpha-value>)',
      },
      borderRadius: {
        sm:   'var(--radius-sm)',
        md:   'var(--radius-md)',
        lg:   'var(--radius-lg)',
        xl:   'var(--radius-xl)',
        '2xl':'var(--radius-2xl)',
        full: 'var(--radius-full)',
      },
      boxShadow: {
        xs:          'var(--shadow-xs)',
        sm:          'var(--shadow-sm)',
        md:          'var(--shadow-md)',
        lg:          'var(--shadow-lg)',
        'focus-ring':'var(--shadow-focus-ring)',
      },
      fontFamily: {
        sans: ['InterVariable', 'Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        shimmer: {
          from: { backgroundPosition: '200% 0' },
          to:   { backgroundPosition: '-200% 0' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'slide-in-right': {
          from: { transform: 'translateX(100%)' },
          to:   { transform: 'translateX(0)' },
        },
        'slide-in-left': {
          from: { transform: 'translateX(-100%)' },
          to:   { transform: 'translateX(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        shimmer:          'shimmer 2s linear infinite',
        'fade-in':        'fade-in var(--duration-base) ease-out',
        'scale-in':       'scale-in var(--duration-base) cubic-bezier(0.2,0,0,1)',
        'slide-in-right': 'slide-in-right var(--duration-slow) cubic-bezier(0.2,0,0,1)',
        'slide-in-left':  'slide-in-left  var(--duration-slow) cubic-bezier(0.2,0,0,1)',
      },
    },
  },
  plugins: [],
}

export default config
