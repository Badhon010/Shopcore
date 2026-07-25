export const endpoints = {
  auth: {
    login: () => '/accounts/login/',
    refresh: () => '/accounts/token/refresh/',
    logout: () => '/accounts/logout/',
    me: () => '/accounts/me/',
  },
} as const