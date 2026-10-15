import { describe, expect, it } from 'vitest'
import {
  restaurantIdsWithSafeNotes,
  FORBIDDEN_SAFETY_CLAIMS,
  SAFE_FILTER_HINT,
  SAFE_FILTER_LABEL,
  dishStatusLabel,
} from './allergy'
import {
  activeFilterCount,
  EMPTY_FILTERS,
  filterVisits,
  filtersToParams,
  kidFriendlyRestaurantIds,
  parseFilters,
  type JournalContext,
} from './journal'
import { timeAgo } from './format'
import { filterWines, isFavoriteWine, wineAverage, EMPTY_WINE_FILTERS } from './wine'
import {
  seedRestaurants,
  seedVisits,
  seedDishes,
  seedWines,
  seedKidInfo,
} from '@/data/mock/seed/journal'

const ctx: JournalContext = {
  restaurants: seedRestaurants(),
  visits: seedVisits(),
  dishes: seedDishes(),
  wines: seedWines(),
  kidInfo: seedKidInfo(),
}
const names = (f: Partial<typeof EMPTY_FILTERS>) =>
  filterVisits(ctx.visits, ctx, { ...EMPTY_FILTERS, ...f })
    .map((v) => ctx.restaurants.find((r) => r.id === v.restaurantId)!.name)
    .sort()

describe('Safe for Mia filter (family notes only)', () => {
  it('includes only restaurants where a dish was noted as fine', () => {
    const ids = restaurantIdsWithSafeNotes(ctx.dishes, ctx.visits)
    const safeNames = [...ids].map((id) => ctx.restaurants.find((r) => r.id === id)!.name).sort()
    expect(safeNames).toEqual(
      [
        "Lou Malnati's Pizzeria",
        'Pita Inn',
        'Superdawg Drive-In',
        'The Original Pancake House',
      ].sort(),
    )
  })

  it('ignores dishes marked avoid or unknown', () => {
    const ids = restaurantIdsWithSafeNotes(
      [
        { visitId: 'a', safeForAllergy: 'avoid' },
        { visitId: 'b', safeForAllergy: 'unknown' },
      ],
      [
        { id: 'a', restaurantId: 'r1' },
        { id: 'b', restaurantId: 'r2' },
      ],
    )
    expect(ids.size).toBe(0)
  })

  it('does not infer anything from allergy note text', () => {
    // Maggiano's has only an "avoid" dish and no safe notes, so it stays out.
    expect(names({ safeForAllergy: true })).not.toContain("Maggiano's Little Italy")
  })

  it('filters the journal to those restaurants', () => {
    expect(names({ safeForAllergy: true })).toEqual(
      [
        "Lou Malnati's Pizzeria",
        'Pita Inn',
        'Superdawg Drive-In',
        'The Original Pancake House',
      ].sort(),
    )
  })

  it('never uses safety-claim wording in its labels', () => {
    const copy = [
      SAFE_FILTER_LABEL,
      SAFE_FILTER_HINT,
      ...(['safe', 'avoid', 'unknown'] as const).map((s) => dishStatusLabel(s, 'Mia')),
    ]
    for (const text of copy)
      for (const banned of FORBIDDEN_SAFETY_CLAIMS) expect(text).not.toMatch(banned)
    expect(SAFE_FILTER_HINT).toMatch(/confirm again/i)
  })
})

describe('journal filters', () => {
  it('searches restaurant names, dishes, wine and notes', () => {
    expect(names({ q: 'shawarma' })).toEqual(['Pita Inn'])
    expect(names({ q: 'chianti' })).toEqual(["Maggiano's Little Italy"])
    expect(names({ q: 'deep dish' })).toEqual(["Lou Malnati's Pizzeria"])
  })

  it('filters by cuisine, drive time, occasion and go-again', () => {
    expect(names({ cuisine: 'Pizza' })).toEqual(["Lou Malnati's Pizzeria"])
    expect(names({ maxDrive: 10 })).toEqual(['Chipotle Mexican Grill', 'Superdawg Drive-In'])
    expect(names({ occasion: 'Date night' })).toEqual(["Cooper's Hawk Winery & Restaurant"])
    expect(names({ goAgain: 'maybe' })).toEqual([
      "Maggiano's Little Italy",
      'The Original Pancake House',
    ])
  })

  it('kid-friendly uses family kid info or place tags', () => {
    const ids = kidFriendlyRestaurantIds(ctx.restaurants, ctx.kidInfo)
    const maggianos = ctx.restaurants.find((r) => r.name.startsWith('Maggiano'))!
    expect(ids.has(maggianos.id)).toBe(false)
    expect(names({ kidFriendly: true })).not.toContain("Maggiano's Little Italy")
    expect(names({ kidFriendly: true })).toContain("Lou Malnati's Pizzeria")
  })

  it('combines filters', () => {
    expect(names({ safeForAllergy: true, goAgain: 'maybe' })).toEqual([
      'The Original Pancake House',
    ])
  })

  it('round-trips through URL params', () => {
    const f = {
      ...EMPTY_FILTERS,
      q: 'pizza',
      safeForAllergy: true,
      maxDrive: 15,
      goAgain: 'yes' as const,
    }
    expect(parseFilters(filtersToParams(f))).toEqual(f)
    expect(activeFilterCount(f)).toBe(4)
    expect(activeFilterCount(EMPTY_FILTERS)).toBe(0)
    expect(parseFilters(new URLSearchParams('again=bogus&drive=abc')).goAgain).toBe('')
  })
})

describe('wine helpers', () => {
  const [w1, w2, w3] = seedWines()

  it('averages ratings and spots favorites (4+ from everyone who rated)', () => {
    expect(wineAverage(w1!)).toBe(4.5)
    expect(isFavoriteWine(w1!)).toBe(true)
    expect(isFavoriteWine(w2!)).toBe(false)
    expect(isFavoriteWine(w3!)).toBe(true)
    expect(isFavoriteWine({ ...w1!, ratings: {} })).toBe(false)
  })

  it('filters by favorites, serving type, rating and text', () => {
    const wines = seedWines()
    expect(filterWines(wines, { ...EMPTY_WINE_FILTERS, favoritesOnly: true })).toHaveLength(2)
    expect(filterWines(wines, { ...EMPTY_WINE_FILTERS, serving: 'bottle' })).toHaveLength(1)
    expect(filterWines(wines, { ...EMPTY_WINE_FILTERS, minRating: 4.5 })).toHaveLength(1)
    expect(filterWines(wines, { ...EMPTY_WINE_FILTERS, q: 'tuscany' }).map((w) => w.name)).toEqual([
      'Chianti Classico',
    ])
  })
})

describe('timeAgo', () => {
  const now = new Date(2026, 9, 8)
  it('describes how old a note is', () => {
    expect(timeAgo('2026-10-08', now)).toBe('today')
    expect(timeAgo('2026-10-07', now)).toBe('yesterday')
    expect(timeAgo('2026-10-01', now)).toBe('7 days ago')
    expect(timeAgo('2026-09-10', now)).toBe('4 weeks ago')
    expect(timeAgo('2026-06-28', now)).toBe('3 months ago')
  })
})
