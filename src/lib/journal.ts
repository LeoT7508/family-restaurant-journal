import type { DishEntry, GoAgain, KidInfo, Restaurant, Visit, WineEntry } from '@/types'
import { restaurantIdsWithSafeNotes } from './allergy'
import { tripDestination } from './trip'

export interface JournalFilters {
  q: string
  cuisine: string
  kidFriendly: boolean
  safeForAllergy: boolean
  maxDrive: number | null
  occasion: string
  goAgain: '' | GoAgain
  /** '' = anywhere, 'home' = near home, otherwise a trip destination. */
  where: string
}

export const EMPTY_FILTERS: JournalFilters = {
  q: '',
  cuisine: '',
  kidFriendly: false,
  safeForAllergy: false,
  maxDrive: null,
  occasion: '',
  goAgain: '',
  where: '',
}

export const DRIVE_OPTIONS = [10, 15, 20, 30] as const

export function parseFilters(params: URLSearchParams): JournalFilters {
  const drive = Number(params.get('drive'))
  const goAgain = params.get('again')
  return {
    q: params.get('q') ?? '',
    cuisine: params.get('cuisine') ?? '',
    kidFriendly: params.get('kids') === '1',
    safeForAllergy: params.get('mia') === '1',
    maxDrive: Number.isFinite(drive) && drive > 0 ? drive : null,
    occasion: params.get('occasion') ?? '',
    goAgain: goAgain === 'yes' || goAgain === 'maybe' || goAgain === 'never' ? goAgain : '',
    where: params.get('where') ?? '',
  }
}

export function filtersToParams(f: JournalFilters): URLSearchParams {
  const p = new URLSearchParams()
  if (f.q) p.set('q', f.q)
  if (f.cuisine) p.set('cuisine', f.cuisine)
  if (f.kidFriendly) p.set('kids', '1')
  if (f.safeForAllergy) p.set('mia', '1')
  if (f.maxDrive) p.set('drive', String(f.maxDrive))
  if (f.occasion) p.set('occasion', f.occasion)
  if (f.goAgain) p.set('again', f.goAgain)
  if (f.where) p.set('where', f.where)
  return p
}

export function activeFilterCount(f: JournalFilters): number {
  return [
    f.q,
    f.cuisine,
    f.kidFriendly,
    f.safeForAllergy,
    f.maxDrive,
    f.occasion,
    f.goAgain,
    f.where,
  ].filter(Boolean).length
}

export interface JournalContext {
  restaurants: Restaurant[]
  visits: Visit[]
  dishes: DishEntry[]
  wines: WineEntry[]
  kidInfo: KidInfo[]
}

/** Kid-friendly = the family logged a kids menu or high chair there, or the place is tagged kid-friendly. */
export function kidFriendlyRestaurantIds(
  restaurants: Restaurant[],
  kidInfo: KidInfo[],
): Set<string> {
  const ids = new Set<string>()
  for (const r of restaurants) if (r.tags.includes('kid-friendly')) ids.add(r.id)
  for (const k of kidInfo) if (k.kidsMenu || k.highChair) ids.add(k.restaurantId)
  return ids
}

export function filterVisits(visits: Visit[], ctx: JournalContext, f: JournalFilters): Visit[] {
  const byId = new Map(ctx.restaurants.map((r) => [r.id, r]))
  const kidIds = kidFriendlyRestaurantIds(ctx.restaurants, ctx.kidInfo)
  const safeIds = restaurantIdsWithSafeNotes(ctx.dishes, ctx.visits)
  const q = f.q.trim().toLowerCase()

  return visits.filter((v) => {
    const r = byId.get(v.restaurantId)
    if (!r) return false
    if (f.cuisine && r.cuisine !== f.cuisine) return false
    if (f.kidFriendly && !kidIds.has(r.id)) return false
    if (f.safeForAllergy && !safeIds.has(r.id)) return false
    if (f.maxDrive && r.driveMinutes > f.maxDrive) return false
    const trip = tripDestination(r.tags)
    if (f.where === 'home' && trip) return false
    if (f.where && f.where !== 'home' && trip !== f.where) return false
    if (f.occasion && !v.occasions.includes(f.occasion)) return false
    if (f.goAgain && v.goAgain !== f.goAgain) return false
    if (q) {
      const haystack = [
        r.name,
        r.cuisine,
        v.notes,
        ...ctx.dishes.filter((d) => d.visitId === v.id).map((d) => d.name),
        ...ctx.wines.filter((w) => w.visitId === v.id).map((w) => w.name),
      ]
        .join(' ')
        .toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  })
}
