import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import prettier from 'eslint-config-prettier'

export default tseslint.config(
  // ── Ignored paths ──────────────────────────────────────────────────────────
  {
    ignores: [
      'dist',
      'eslint.config.js',
      'vite.config.ts',
      'tailwind.config.ts',
      'postcss.config.js',
    ],
  },

  // ── Base JS recommended ────────────────────────────────────────────────────
  js.configs.recommended,

  // ── TypeScript type-checked recommended ───────────────────────────────────
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: tseslint.configs.recommendedTypeChecked,
    languageOptions: {
      parserOptions: {
        project: './tsconfig.app.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // ── React Hooks ────────────────────────────────────────────────────────────
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  // ── Accessibility ──────────────────────────────────────────────────────────
  jsxA11y.flatConfigs.recommended,

  // ── Project-wide rule overrides ────────────────────────────────────────────
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'jsx-a11y/anchor-is-valid': 'warn',
      // React async event handlers (onSubmit, onClick, etc.) return Promises
      // but the DOM attribute type expects void — this is the idiomatic React pattern.
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: { attributes: false } }],
      // This rule is new in typescript-eslint v8 and requires normalizeError() to
      // return an Error subclass — a separate refactoring tracked as a follow-up.
      '@typescript-eslint/prefer-promise-reject-errors': 'off',
    },
  },

  // ── Prettier (must be last — disables conflicting formatting rules) ─────────
  prettier,
)
