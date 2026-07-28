import { z } from 'zod'

export const emailSchema = z.string().email('Enter a valid email address')

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')

export const requiredString = (label = 'This field') =>
  z.string().min(1, `${label} is required`)

export const optionalString = z.string().optional()

export const positiveNumber = (label = 'Value') =>
  z.number({ invalid_type_error: `${label} must be a number` }).positive(`${label} must be positive`)

export const nonNegativeNumber = (label = 'Value') =>
  z.number({ invalid_type_error: `${label} must be a number` }).min(0, `${label} must be 0 or more`)

export const slugSchema = z
  .string()
  .regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers, and hyphens')
  .min(1, 'Slug is required')

export const urlSchema = z.string().url('Enter a valid URL').or(z.literal(''))
