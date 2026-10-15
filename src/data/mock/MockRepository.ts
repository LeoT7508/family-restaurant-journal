import type { BaseRecord, NewRecord } from '@/types'
import type { Repository } from '@/data/repositories'
import type { LocalStorageStore } from './LocalStorageStore'

export const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

export class NotFoundError extends Error {
  constructor(what: string, id: string) {
    super(`${what} "${id}" was not found`)
    this.name = 'NotFoundError'
  }
}

/** Shared CRUD for every mock collection. Writes go to localStorage first and are marked 'local'. */
export class MockRepository<T extends BaseRecord> implements Repository<T> {
  constructor(
    protected readonly store: LocalStorageStore<T>,
    private readonly label = 'Record',
  ) {}

  async list(): Promise<T[]> {
    return [...this.store.all()]
  }

  async get(id: string): Promise<T | null> {
    return this.store.all().find((r) => r.id === id) ?? null
  }

  async create(input: NewRecord<T>): Promise<T> {
    const now = new Date().toISOString()
    // Generic spread loses the exact type; the stored shape is validated when it is next loaded.
    const record = {
      ...input,
      id: newId(),
      createdAt: now,
      updatedAt: now,
      syncStatus: 'local',
    } as unknown as T
    this.store.replaceAll([...this.store.all(), record])
    return record
  }

  async update(id: string, patch: Partial<NewRecord<T>>): Promise<T> {
    const current = this.store.all().find((r) => r.id === id)
    if (!current) throw new NotFoundError(this.label, id)
    const next = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
      syncStatus: 'local',
    } as T
    this.store.replaceAll(this.store.all().map((r) => (r.id === id ? next : r)))
    return next
  }

  async remove(id: string): Promise<void> {
    this.store.replaceAll(this.store.all().filter((r) => r.id !== id))
  }
}
