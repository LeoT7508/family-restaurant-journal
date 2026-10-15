import { z } from 'zod'
import { baseRecordShape } from './common'

export const householdSchema = z.object({
  ...baseRecordShape,
  name: z.string().min(1),
  homeZip: z.string().regex(/^\d{5}$/),
  homeLabel: z.string(),
  /** Max drive time (minutes) used by filters and "Where tonight?". */
  driveRadiusMinutes: z.number().int().min(5).max(120),
  /** Set while the family is away from home (travel mode). */
  travel: z.object({ destination: z.string().min(1) }).optional(),
})

export const homeFormSchema = z.object({
  homeLabel: z.string().trim().min(1, 'Add a place name'),
  homeZip: z.string().regex(/^\d{5}$/, 'Use a 5-digit ZIP code'),
  driveRadiusMinutes: z
    .number({ invalid_type_error: 'Enter minutes' })
    .int('Whole minutes only')
    .min(5, 'At least 5 minutes')
    .max(120, 'Up to 120 minutes'),
})
export type HomeFormValues = z.infer<typeof homeFormSchema>
export type Household = z.infer<typeof householdSchema>
