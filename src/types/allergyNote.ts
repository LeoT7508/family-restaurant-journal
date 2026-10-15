import { z } from 'zod'
import { baseRecordShape } from './common'

/** The family's own record of what they told a restaurant and what was said. Dated, never a guarantee. */
export const allergyNoteSchema = z.object({
  ...baseRecordShape,
  restaurantId: z.string(),
  memberId: z.string(),
  note: z.string().min(1, 'Write what was said'),
  askedWho: z.string(),
  dateAsked: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})
export type AllergyNote = z.infer<typeof allergyNoteSchema>

export const allergyNoteFormSchema = z.object({
  memberId: z.string().min(1, 'Choose who this is about'),
  note: z.string().trim().min(1, 'Write what was said'),
  askedWho: z.string().trim().min(1, 'Who did you ask?'),
  dateAsked: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date'),
})
export type AllergyNoteFormValues = z.infer<typeof allergyNoteFormSchema>
