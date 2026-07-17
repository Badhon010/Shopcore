export const ERROR_MESSAGES = {
  network: 'Network error. Please check your connection and try again.',
  serverError: 'Something went wrong on our end. Please try again later.',
  notFound: 'The requested resource could not be found.',
  unauthorized: 'Your session has expired. Please log in again.',
  forbidden: 'You do not have permission to perform this action.',
  validation: 'Please check your input and try again.',
  timeout: 'The request timed out. Please try again.',
  offline: 'You appear to be offline. Please check your connection.',
  generic: 'An unexpected error occurred. Please try again.',
} as const

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return ERROR_MESSAGES.generic
}
