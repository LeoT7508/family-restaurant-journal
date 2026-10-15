import type { ZodType, ZodTypeDef } from 'zod'
import type { BaseRecord } from '@/types'

export const STORAGE_PREFIX = 'frj.v1.'

export class StorageFullError extends Error {
  constructor() {
    super('Your browser storage is full. Try removing a photo or two.')
    this.name = 'StorageFullError'
  }
}

/**
 * A tiny collection persisted as JSON in localStorage. First read seeds it.
 * Invalid records are dropped (with a console warning) instead of crashing the app.
 */
export class LocalStorageStore<T extends BaseRecord> {
  private cache: T[] | null = null
  readonly storageKey: string

  constructor(
    name: string,
    private readonly schema: ZodType<T, ZodTypeDef, unknown>,
    private readonly seed: () => T[],
  ) {
    this.storageKey = STORAGE_PREFIX + name
  }

  all(): T[] {
    if (!this.cache) this.cache = this.load()
    return this.cache
  }

  replaceAll(items: T[]): void {
    const previous = this.cache
    this.cache = items
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(items))
    } catch {
      this.cache = previous
      throw new StorageFullError()
    }
  }

  private load(): T[] {
    try {
      const raw = localStorage.getItem(this.storageKey)
      if (raw === null) {
        const seeded = this.seed()
        localStorage.setItem(this.storageKey, JSON.stringify(seeded))
        return seeded
      }
      const parsed: unknown = JSON.parse(raw)
      if (!Array.isArray(parsed)) throw new Error('not an array')
      return parsed.flatMap((item) => {
        const result = this.schema.safeParse(item)
        if (result.success) return [result.data]
        console.warn(`[${this.storageKey}] dropped an invalid record`, result.error.issues)
        return []
      })
    } catch (error) {
      console.warn(`[${this.storageKey}] could not read storage, using seed data`, error)
      return this.seed()
    }
  }
}

/** Remove every journal key. `empty` keeps the family but starts with no visits (first-run state). */
export function resetStorage(mode: 'seed' | 'empty'): void {
  const keys = Object.keys(localStorage).filter((k) => k.startsWith(STORAGE_PREFIX))
  keys.forEach((k) => localStorage.removeItem(k))
  if (mode === 'empty') {
    for (const name of [
      'restaurants',
      'visits',
      'dishes',
      'wines',
      'kidInfo',
      'allergies',
      'wishlist',
    ]) {
      localStorage.setItem(STORAGE_PREFIX + name, '[]')
    }
  }
}
