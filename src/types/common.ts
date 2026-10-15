import { z } from 'zod'

/** Where a record stands relative to a (future) server. Local-first: new edits start as 'local'. */
export const syncStatusSchema = z.enum(['local', 'pending', 'synced'])
export type SyncStatus = z.infer<typeof syncStatusSchema>

export const idSchema = z.string().min(1)

/** Fields every stored record carries. */
export const baseRecordShape = {
  id: idSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  syncStatus: syncStatusSchema,
}
export const baseRecordSchema = z.object(baseRecordShape)
export type BaseRecord = z.infer<typeof baseRecordSchema>

/** Anything you pass to `create`: the repository fills in id, timestamps and syncStatus. */
export type NewRecord<T extends BaseRecord> = Omit<T, keyof BaseRecord>

export const ratingSchema = z.number().int().min(1).max(5)
/** A rating per parent, keyed by member id. */
export const ratingsByMemberSchema = z.record(z.string(), ratingSchema)
export type RatingsByMember = z.infer<typeof ratingsByMemberSchema>
