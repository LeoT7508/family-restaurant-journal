import { z } from 'zod'
import { baseRecordShape } from './common'

export const wishlistItemSchema = z.object({
  ...baseRecordShape,
  restaurantId: z.string(),
  addedBy: z.string(),
  note: z.string(),
})
export type WishlistItem = z.infer<typeof wishlistItemSchema>
