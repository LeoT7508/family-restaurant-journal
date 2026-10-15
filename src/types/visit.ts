import { z } from 'zod'
import { baseRecordShape, ratingSchema, ratingsByMemberSchema } from './common'

export const goAgainSchema = z.enum(['yes', 'maybe', 'never'])
export type GoAgain = z.infer<typeof goAgainSchema>

export const OCCASIONS = [
  'Date night',
  'Family dinner',
  'Birthday',
  'Celebration',
  'Quick bite',
  'Weekend brunch',
  'Takeout',
  'With friends',
] as const

export const visitSchema = z.object({
  ...baseRecordShape,
  restaurantId: z.string(),
  /** ISO date (YYYY-MM-DD). */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  loggedBy: z.string(),
  occasions: z.array(z.string()),
  goAgain: goAgainSchema.optional(),
  /** Each parent's own rating, keyed by member id. */
  ratings: ratingsByMemberSchema,
  /** How the family felt overall. */
  familyRating: ratingSchema.optional(),
  amountSpent: z.number().min(0).optional(),
  subtotal: z.number().min(0).optional(),
  tip: z.number().min(0).optional(),
  partySize: z.number().int().min(1).max(30).optional(),
  notes: z.string(),
  /** Photos as data URLs (mock) or URLs (real storage later). */
  photos: z.array(z.string()),
  isDraft: z.boolean(),
})
export type Visit = z.infer<typeof visitSchema>

export const quickLogFormSchema = z.object({
  /** The chosen place (placeId). */
  placeId: z.string().min(1, 'Pick a restaurant first'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date'),
  familyRating: ratingSchema.optional(),
  note: z.string().max(500, 'Keep it under 500 characters'),
})
export type QuickLogFormValues = z.infer<typeof quickLogFormSchema>

const money = z
  .number({ invalid_type_error: 'Enter a number' })
  .min(0, 'Can’t be negative')
  .optional()

export const costsFormSchema = z.object({
  amountSpent: money,
  subtotal: money,
  tip: money,
  partySize: z
    .number({ invalid_type_error: 'Enter a number' })
    .int('Whole people only')
    .min(1, 'At least 1')
    .max(30)
    .optional(),
})
export type CostsFormValues = z.infer<typeof costsFormSchema>
