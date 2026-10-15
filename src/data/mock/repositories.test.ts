import { describe, expect, it } from 'vitest'
import {
  MockRestaurantRepository,
  MockVisitRepository,
  MockFamilyRepository,
  MockWishlistRepository,
} from './repositories'
import { LocalStorageStore, resetStorage } from './LocalStorageStore'
import { MockPlacesService } from '@/services/mock/MockPlacesService'
import { visitSchema } from '@/types'

const newVisit = (restaurantId = 'rest-x') => ({
  restaurantId,
  date: '2026-10-01',
  loggedBy: 'alex',
  occasions: [],
  ratings: {},
  notes: 'hi',
  photos: [],
  isDraft: true,
})

describe('seed data', () => {
  it('seeds the family with Mia’s egg allergy', async () => {
    const members = await new MockFamilyRepository().listMembers()
    expect(members.map((m) => m.name)).toEqual(['Alex', 'Sam', 'Max', 'Mia'])
    expect(members.find((m) => m.name === 'Mia')?.allergies).toEqual(['egg'])
    expect(members.filter((m) => m.isParent)).toHaveLength(2)
  })

  it('seeds a household at 60601 with a 20 minute radius', async () => {
    const household = await new MockFamilyRepository().getHousehold()
    expect(household.homeZip).toBe('60601')
    expect(household.driveRadiusMinutes).toBe(20)
  })

  it('seeded visits all satisfy the schema', async () => {
    const visits = await new MockVisitRepository().list()
    expect(visits.length).toBeGreaterThan(3)
    for (const v of visits) expect(visitSchema.safeParse(v).success).toBe(true)
    expect(visits.some((v) => v.isDraft)).toBe(true)
  })
})

describe('MockRepository CRUD', () => {
  it('creates records with id, timestamps and a local syncStatus', async () => {
    const repo = new MockVisitRepository()
    const created = await repo.create(newVisit())
    expect(created.id).toBeTruthy()
    expect(created.syncStatus).toBe('local')
    expect(created.createdAt).toBe(created.updatedAt)
    expect(await repo.get(created.id)).toEqual(created)
  })

  it('persists across repository instances (survives a refresh)', async () => {
    const created = await new MockVisitRepository().create(newVisit())
    const fresh = new MockVisitRepository()
    expect((await fresh.get(created.id))?.notes).toBe('hi')
  })

  it('update merges, bumps updatedAt and marks the record local', async () => {
    const repo = new MockVisitRepository()
    const seeded = (await repo.list()).find((v) => v.syncStatus === 'synced')!
    const updated = await repo.update(seeded.id, { notes: 'changed' })
    expect(updated.notes).toBe('changed')
    expect(updated.restaurantId).toBe(seeded.restaurantId)
    expect(updated.syncStatus).toBe('local')
    expect(updated.updatedAt >= seeded.updatedAt).toBe(true)
  })

  it('update on a missing record throws', async () => {
    await expect(new MockVisitRepository().update('nope', { notes: 'x' })).rejects.toThrow(
      /not found/i,
    )
  })

  it('remove deletes the record', async () => {
    const repo = new MockVisitRepository()
    const created = await repo.create(newVisit())
    await repo.remove(created.id)
    expect(await repo.get(created.id)).toBeNull()
  })

  it('listByRestaurant filters visits', async () => {
    const repo = new MockVisitRepository()
    await repo.create(newVisit('rest-unique'))
    expect(await repo.listByRestaurant('rest-unique')).toHaveLength(1)
  })

  it('wishlist findByRestaurant returns the matching item', async () => {
    const repo = new MockWishlistRepository()
    const first = (await repo.list())[0]!
    expect((await repo.findByRestaurant(first.restaurantId))?.id).toBe(first.id)
    expect(await repo.findByRestaurant('missing')).toBeNull()
  })
})

describe('restaurants', () => {
  it('upsertFromPlace saves a place once and reuses it', async () => {
    const places = new MockPlacesService()
    const [place] = await places.search('portillo')
    const repo = new MockRestaurantRepository()
    const a = await repo.upsertFromPlace(place!)
    const b = await repo.upsertFromPlace(place!)
    expect(a.id).toBe(b.id)
    expect(a.name).toBe("Portillo's")
    expect(a.syncStatus).toBe('local')
  })
})

describe('storage robustness', () => {
  it('drops invalid records instead of crashing', async () => {
    localStorage.setItem(
      'frj.v1.visits',
      JSON.stringify([
        { id: 'bad' },
        { ...newVisit(), id: 'ok', createdAt: 'x', updatedAt: 'x', syncStatus: 'local' },
      ]),
    )
    const visits = await new MockVisitRepository().list()
    expect(visits.map((v) => v.id)).toEqual(['ok'])
  })

  it('falls back to seed data when storage is corrupt', async () => {
    localStorage.setItem('frj.v1.visits', '{not json')
    expect((await new MockVisitRepository().list()).length).toBeGreaterThan(3)
  })

  it('resetStorage("empty") clears journal data but keeps the family', async () => {
    new MockVisitRepository().list()
    resetStorage('empty')
    expect(await new MockVisitRepository().list()).toEqual([])
    expect((await new MockFamilyRepository().listMembers()).length).toBe(4)
  })

  it('surfaces a friendly error when storage is full', () => {
    const store = new LocalStorageStore('tmp', visitSchema, () => [])
    store.all()
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = () => {
      throw new DOMException('full', 'QuotaExceededError')
    }
    try {
      expect(() => store.replaceAll([])).toThrow(/storage is full/i)
    } finally {
      Storage.prototype.setItem = original
    }
  })
})

describe('MockPlacesService', () => {
  const places = new MockPlacesService()

  it('has ~25 places, sorted nearest first when searching', async () => {
    const all = await places.search('', { limit: 100 })
    expect(all.length).toBeGreaterThanOrEqual(25)
    const minutes = all.map((p) => p.driveMinutes)
    expect(minutes).toEqual([...minutes].sort((a, b) => a - b))
  })

  it('matches by name, cuisine, and ignores apostrophes and case', async () => {
    expect((await places.search('LOU MALNATIS')).map((p) => p.name)).toContain(
      "Lou Malnati's Pizzeria",
    )
    expect((await places.search('polish')).map((p) => p.name)).toContain('Smak-Tak')
  })

  it('respects maxDriveMinutes', async () => {
    const near = await places.search('', { maxDriveMinutes: 8, limit: 100 })
    expect(near.every((p) => p.driveMinutes <= 8)).toBe(true)
  })

  it('looks up by id', async () => {
    expect((await places.getById('mock:superdawg'))?.name).toBe('Superdawg Drive-In')
    expect(await places.getById('nope')).toBeNull()
  })
})
