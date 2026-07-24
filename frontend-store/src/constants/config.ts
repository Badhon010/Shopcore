export const APP_CONFIG = {
  name: 'ShopCore',
  description: 'Premium quality goods, curated with care.',
  url: import.meta.env.VITE_APP_URL ?? '',
  defaultCurrency: import.meta.env.VITE_DEFAULT_CURRENCY ?? 'USD',
  defaultLocale: import.meta.env.VITE_DEFAULT_LOCALE ?? 'en-US',
  contactEmail: 'hello@shopcore.com',
  socials: {
    twitter: 'https://twitter.com/shopcore',
    instagram: 'https://instagram.com/shopcore',
    facebook: 'https://facebook.com/shopcore',
  },
  pagination: {
    defaultPageSize: 24,
    reviewsPageSize: 10,
    ordersPageSize: 10,
  },
  lowStockThreshold: 5,
  cartTokenKey: 'shopcore-cart-token',
  themeKey: 'shopcore-theme',
}
