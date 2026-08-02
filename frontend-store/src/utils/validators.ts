import { z } from 'zod'

export const emailSchema = z.string().min(1, 'Email is required').email('Invalid email address')

export const passwordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .regex(/[A-Za-z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number')

export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{6,14}$/, 'Invalid phone number')
  .optional()
  .or(z.literal(''))

export const positiveNumberSchema = z.number().positive()

export const urlSchema = z.string().url('Invalid URL').optional().or(z.literal(''))
