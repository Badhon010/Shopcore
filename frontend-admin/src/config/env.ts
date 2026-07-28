export const env = {
  apiBaseUrl: import.meta.env['VITE_API_BASE_URL'] ?? '/api',
  appName:    import.meta.env['VITE_APP_NAME'] ?? 'ShopCore Admin',
  isDev:      import.meta.env.DEV,
  isProd:     import.meta.env.PROD,
}
