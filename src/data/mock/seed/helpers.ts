import type { BaseRecord } from '@/types'

export const SEED_DATE = '2026-01-01T12:00:00.000Z'

/** Base fields for seed records. They start as 'synced' as if they already came from a server. */
export const base = (id: string): BaseRecord => ({
  id,
  createdAt: SEED_DATE,
  updatedAt: SEED_DATE,
  syncStatus: 'synced',
})

export const IDS = {
  alex: 'alex',
  sam: 'sam',
  max: 'max',
  mia: 'mia',
} as const
