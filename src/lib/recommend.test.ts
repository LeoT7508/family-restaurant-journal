import { describe, expect, it } from 'vitest'
import { DEFAULT_ANSWERS, recommend, type RecommendContext, type TonightAnswers } from './recommend'
import { FORBIDDEN_SAFETY_CLAIMS } from './allergy'
import { seedMembers } from '@/data/mock/seed/family'
import {
  seedAllergyNotes,
  seedDishes,
  seedKidInfo,
  seedRestaurants,
  seedVisits,
  seedWines,
  seedWishlist,
} from '@/data/mock/seed/journal'
import { MOCK_PLACES } from '@/services/mock/placesData'

const ctx = (over: Partial<RecommendContext> = {}): RecommendContext => ({
  restaurants: seedRestaurants(),
  visits: seedVisits(),
  dishes: seedDishes(),
  wines: seedWines(),
  kidInfo: seedKidInfo(),
  wishlist: seedWishlist(),
  members: seedMembers(),
  places: MOCK_PLACES,
  now: new Date(2026, 9, 8),
  ...over,
})
const ask = (over: Partial<TonightAnswers> = {}): TonightAnswers => ({
  ...DEFAULT_ANSWERS,
  ...over,
})
const names = (a: TonightAnswers, c = ctx(), o = {}) =>
  recommend(a, c, o).suggestions.map((s) => s.place.name)

describe('recommend', () => {
  it('returns at most 3, and history before new places', () => {
    const { suggestions } = recommend(ask(), ctx())
    expect(suggestions).toHaveLength(3)
    expect(suggestions.every((s) => s.source !== 'new')).toBe(true)
  })

  it('respects the max drive time', () => {
    const result = recommend(ask({ maxDriveMinutes: 10 }), ctx()).suggestions
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((s) => s.place.driveMinutes <= 10)).toBe(true)
  })

  it('filters by cuisine mood', () => {
    expect(names(ask({ cuisines: ['Pizza'] }))[0]).toBe("Lou Malnati's Pizzeria")
    const all = recommend(ask({ cuisines: ['Pizza'], maxDriveMinutes: 30 }), ctx(), {
      limit: 10,
    }).suggestions
    expect(all.every((s) => s.place.cuisine === 'Pizza')).toBe(true)
  })

  it('tops up with new places only when history runs short', () => {
    const { suggestions, fromHistory } = recommend(ask({ cuisines: ['Pizza'] }), ctx())
    expect(suggestions).toHaveLength(3)
    expect(fromHistory).toBe(1)
    expect(suggestions[0]!.source).toBe('journal')
    expect(suggestions.slice(1).every((s) => s.source === 'new')).toBe(true)
  })

  it('can be limited to history only (for home-screen ideas)', () => {
    const { suggestions } = recommend(ask({ cuisines: ['Pizza'] }), ctx(), { includeNew: false })
    expect(suggestions.map((s) => s.place.name)).toEqual(["Lou Malnati's Pizzeria"])
  })

  it('leaves out places the family said "never" to, and closed places', () => {
    const visits = seedVisits().map((v) =>
      v.id === 'visit-lou' ? { ...v, goAgain: 'never' as const } : v,
    )
    expect(names(ask({ maxDriveMinutes: 30 }), ctx({ visits }), { limit: 20 })).not.toContain(
      "Lou Malnati's Pizzeria",
    )
    const restaurants = seedRestaurants().map((r) =>
      r.placeId === 'mock:superdawg' ? { ...r, status: 'closed' as const } : r,
    )
    expect(names(ask({ maxDriveMinutes: 30 }), ctx({ restaurants }), { limit: 20 })).not.toContain(
      'Superdawg Drive-In',
    )
  })

  it('"show me different ones" excludes what was already shown', () => {
    const first = recommend(ask(), ctx()).suggestions
    const second = recommend(ask(), ctx(), {
      exclude: new Set(first.map((s) => s.key)),
    }).suggestions
    expect(second.length).toBeGreaterThan(0)
    expect(second.some((s) => first.some((f) => f.key === s.key))).toBe(false)
  })

  it('ranks a place you were at very recently lower than one you have not visited in a while', () => {
    const visits = seedVisits().map((v) =>
      v.id === 'visit-lou' ? { ...v, date: '2026-10-06' } : v,
    )
    const order = names(ask({ cuisines: [] }), ctx({ visits }), { limit: 20 })
    expect(order.indexOf("Lou Malnati's Pizzeria")).toBeGreaterThan(order.indexOf('Pita Inn'))
  })

  it('prefers higher-rated, go-again places', () => {
    const order = names(ask({ maxDriveMinutes: 30 }), ctx(), { limit: 20 })
    expect(order.indexOf("Cooper's Hawk Winery & Restaurant")).toBeLessThan(
      order.indexOf("Maggiano's Little Italy"),
    )
  })

  it('wishlist places are included and say who added them', () => {
    const { suggestions } = recommend(ask({ maxDriveMinutes: 30 }), ctx(), { limit: 20 })
    const smak = suggestions.find((s) => s.place.name === 'Smak-Tak')
    expect(smak?.source).toBe('wishlist')
    expect(smak?.reasons.join(' ')).toMatch(/added by Sam/)
  })

  describe('constraints', () => {
    it('kid-friendly', () => {
      const r = recommend(ask({ kidFriendly: true, maxDriveMinutes: 30 }), ctx(), {
        limit: 20,
      }).suggestions
      expect(r.map((s) => s.place.name)).not.toContain("Maggiano's Little Italy")
    })

    it('wine list', () => {
      const r = names(ask({ wineList: true, maxDriveMinutes: 30 }), ctx(), { limit: 20 })
      expect(r).toContain("Cooper's Hawk Winery & Restaurant")
      expect(r).not.toContain('Superdawg Drive-In')
    })

    it('quick service', () => {
      const r = names(ask({ quickService: true, maxDriveMinutes: 30 }), ctx(), { limit: 20 })
      expect(r).toContain('Superdawg Drive-In')
      expect(r).not.toContain("Maggiano's Little Italy")
    })

    it('Safe for Mia uses only the family notes, so new places never qualify', () => {
      const { suggestions } = recommend(ask({ safeForAllergy: true, maxDriveMinutes: 30 }), ctx(), {
        limit: 20,
      })
      const found = suggestions.map((s) => s.place.name).sort()
      expect(found).toEqual(
        [
          "Lou Malnati's Pizzeria",
          'Pita Inn',
          'Superdawg Drive-In',
          'The Original Pancake House',
        ].sort(),
      )
      expect(suggestions.every((s) => s.source !== 'new')).toBe(true)
      // Allergy-note text alone must not qualify a place.
      const noDishNotes = ctx({
        dishes: seedDishes().map((d) => ({ ...d, safeForAllergy: 'unknown' as const })),
      })
      expect(
        recommend(ask({ safeForAllergy: true, maxDriveMinutes: 30 }), noDishNotes).suggestions,
      ).toEqual([])
      expect(seedAllergyNotes().length).toBeGreaterThan(0)
    })
  })

  it('never uses safety-claim wording and always prompts to confirm', () => {
    const { suggestions } = recommend(ask({ safeForAllergy: true, maxDriveMinutes: 30 }), ctx(), {
      limit: 20,
    })
    for (const s of suggestions) {
      const text = s.reasons.join(' ')
      for (const banned of FORBIDDEN_SAFETY_CLAIMS) expect(text).not.toMatch(banned)
      expect(text).toMatch(/confirm with the restaurant again/i)
    }
  })

  it('returns nothing when no place matches', () => {
    expect(recommend(ask({ cuisines: ['Klingon'] }), ctx()).suggestions).toEqual([])
  })
})
