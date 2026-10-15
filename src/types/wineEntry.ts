import { z } from 'zod'
import { baseRecordShape, ratingsByMemberSchema } from './common'

export const servingTypeSchema = z.enum(['glass', 'bottle'])

export const wineEntrySchema = z.object({
  ...baseRecordShape,
  visitId: z.string(),
  name: z.string().min(1),
  producer: z.string(),
  grapeOrRegion: z.string(),
  servingType: servingTypeSchema,
  price: z.number().min(0).optional(),
  ratings: ratingsByMemberSchema,
  tastingNote: z.string(),
  labelPhoto: z.string().optional(),
  pairedDishIds: z.array(z.string()),
})
export type WineEntry = z.infer<typeof wineEntrySchema>

const optionalNumber = z.number({ invalid_type_error: 'Enter a number' }).min(0).optional()

export const wineFormSchema = z.object({
  name: z.string().trim().min(1, 'What was the wine?'),
  producer: z.string().trim(),
  grapeOrRegion: z.string().trim(),
  servingType: servingTypeSchema,
  price: optionalNumber,
  ratings: ratingsByMemberSchema,
  tastingNote: z.string().max(500, 'Keep it under 500 characters'),
  labelPhoto: z.string().optional(),
  pairedDishIds: z.array(z.string()),
})
export type WineFormValues = z.infer<typeof wineFormSchema>
