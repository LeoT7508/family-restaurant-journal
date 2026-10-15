import { z } from 'zod'
import { baseRecordShape } from './common'

export const verdictSchema = z.enum(['loved', 'okay', 'skip'])
export type Verdict = z.infer<typeof verdictSchema>

/** The family's own note about whether Mia ate it fine. Never a safety claim. */
export const allergyStatusSchema = z.enum(['safe', 'avoid', 'unknown'])
export type AllergyStatus = z.infer<typeof allergyStatusSchema>

export const dishEntrySchema = z.object({
  ...baseRecordShape,
  visitId: z.string(),
  name: z.string().min(1),
  eatenBy: z.array(z.string()),
  verdicts: z.record(z.string(), verdictSchema),
  safeForAllergy: allergyStatusSchema,
  photo: z.string().optional(),
})
export type DishEntry = z.infer<typeof dishEntrySchema>

export const dishFormSchema = z.object({
  name: z.string().trim().min(1, 'What was it called?'),
  eatenBy: z.array(z.string()),
  verdicts: z.record(z.string(), verdictSchema),
  safeForAllergy: allergyStatusSchema,
  photo: z.string().optional(),
})
export type DishFormValues = z.infer<typeof dishFormSchema>
