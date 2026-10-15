import { z } from 'zod'
import { baseRecordShape } from './common'

export const restaurantStatusSchema = z.enum(['open', 'closed'])
export const priceLevelSchema = z.number().int().min(1).max(4)

/** What a places search returns (before the family has saved anything). */
export const placeResultSchema = z.object({
  placeId: z.string(),
  name: z.string(),
  address: z.string(),
  cuisine: z.string(),
  priceLevel: priceLevelSchema,
  driveMinutes: z.number().int().min(0),
  tags: z.array(z.string()),
})
export type PlaceResult = z.infer<typeof placeResultSchema>

export const restaurantSchema = z.object({
  ...baseRecordShape,
  placeId: z.string(),
  name: z.string().min(1),
  address: z.string(),
  cuisine: z.string(),
  priceLevel: priceLevelSchema,
  driveMinutes: z.number().int().min(0),
  status: restaurantStatusSchema,
  tags: z.array(z.string()),
})
export type Restaurant = z.infer<typeof restaurantSchema>
export type RestaurantStatus = z.infer<typeof restaurantStatusSchema>

export const restaurantFormSchema = z.object({
  name: z.string().trim().min(1, 'Add a name'),
  address: z.string().trim(),
  cuisine: z.string().trim().min(1, 'Add a cuisine'),
  priceLevel: priceLevelSchema,
  driveMinutes: z
    .number({ invalid_type_error: 'Enter minutes' })
    .int('Whole minutes only')
    .min(0, 'Can’t be negative')
    .max(300),
})
export type RestaurantFormValues = z.infer<typeof restaurantFormSchema>

/** A place typed in by hand because search did not find it (or while travelling). */
export const manualPlaceFormSchema = z.object({
  name: z.string().trim().min(1, 'Add a name'),
  cuisine: z.string().trim().min(1, 'Add a cuisine'),
  address: z.string().trim(),
  priceLevel: priceLevelSchema,
  driveMinutes: z
    .number({ invalid_type_error: 'Enter minutes' })
    .int('Whole minutes only')
    .min(0, 'Can’t be negative')
    .max(300),
})
export type ManualPlaceFormValues = z.infer<typeof manualPlaceFormSchema>
