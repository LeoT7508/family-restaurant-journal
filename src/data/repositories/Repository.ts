import type { BaseRecord, NewRecord } from '@/types'

/**
 * The shape every repository shares. Methods are async on purpose: the mock resolves
 * instantly, but a real back end (Supabase) will not.
 *
 * `create` fills in id, createdAt, updatedAt and syncStatus. `update` bumps updatedAt
 * and marks the record as not yet synced.
 */
export interface Repository<T extends BaseRecord> {
  list(): Promise<T[]>
  get(id: string): Promise<T | null>
  create(input: NewRecord<T>): Promise<T>
  update(id: string, patch: Partial<NewRecord<T>>): Promise<T>
  remove(id: string): Promise<void>
}
