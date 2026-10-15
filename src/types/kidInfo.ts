import { z } from 'zod'
import { baseRecordShape } from './common'

export const kidInfoSchema = z.object({
  ...baseRecordShape,
  restaurantId: z.string(),
  visitId: z.string().optional(),
  kidsMenu: z.boolean(),
  highChair: z.boolean(),
  roomForStroller: z.boolean(),
  quickService: z.boolean(),
  /** Favorite dish per child, keyed by member id. */
  favoriteDishByChild: z.record(z.string(), z.string()),
})
export type KidInfo = z.infer<typeof kidInfoSchema>

export const kidInfoFormSchema = z.object({
  kidsMenu: z.boolean(),
  highChair: z.boolean(),
  roomForStroller: z.boolean(),
  quickService: z.boolean(),
  favoriteDishByChild: z.record(z.string(), z.string()),
})
export type KidInfoFormValues = z.infer<typeof kidInfoFormSchema>
