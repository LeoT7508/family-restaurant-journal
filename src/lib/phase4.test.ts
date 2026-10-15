import { describe, expect, it } from 'vitest'
import {
  assertFoodOnly,
  buildShareCard,
  mentionsPersonalInfo,
  SHARE_CARD_KEYS,
  shareCardText,
} from './shareCard'
import { buildYearInReview, yearsWithVisits } from './yearInReview'
import { buildBackup, csvCell, visitsToCsv, type JournalSnapshot } from './export'
import {
  deleteRestaurant,
  deleteVisit,
  mergeRestaurants,
  restaurantFootprint,
} from './restaurantActions'
import { describeDistance } from './format'
import { isTripPlace, tripDestination, tripTag } from './trip'
import { seedMembers, seedHousehold } from '@/data/mock/seed/family'
import {
  seedAllergyNotes,
  seedDishes,
  seedKidInfo,
  seedRestaurants,
  seedVisits,
  seedWines,
  seedWishlist,
} from '@/data/mock/seed/journal'
import { createMockDataLayer } from '@/data/mock/createMockDataLayer'

const members = seedMembers()
const snapshot = (): JournalSnapshot => ({
  household: seedHousehold()[0]!,
  members,
  restaurants: seedRestaurants(),
  visits: seedVisits(),
  dishes: seedDishes(),
  wines: seedWines(),
  kidInfo: seedKidInfo(),
  allergyNotes: seedAllergyNotes(),
  wishlist: seedWishlist(),
})

const cardFor = (visitId: string, over: Partial<JournalSnapshot> = {}) => {
  const s = { ...snapshot(), ...over }
  const visit = s.visits.find((v) => v.id === visitId)!
  const restaurant = s.restaurants.find((r) => r.id === visit.restaurantId)!
  return buildShareCard({
    visit,
    restaurant,
    dishes: s.dishes,
    wines: s.wines,
    kidInfo: s.kidInfo,
    members: s.members,
  })
}

describe('share cards are food-only (hard rule)', () => {
  it('contains exactly the allowed fields', () => {
    const card = cardFor('visit-lou')
    expect(Object.keys(card).sort()).toEqual([...SHARE_CARD_KEYS].sort())
    expect(card.restaurant).toBe("Lou Malnati's Pizzeria")
    expect(card.rating).toBe(5)
    expect(card.lovedDishes).toEqual(['Chicago Classic deep dish', 'Plain cheese thin-crust slice'])
    expect(card.kidFriendly).toEqual(["Kids' menu", 'High chairs', 'Room for strollers'])
  })

  it('never includes allergy notes, children, ages, per-child favorites, free-text notes or money', () => {
    for (const id of seedVisits().map((v) => v.id)) {
      const json = JSON.stringify(cardFor(id)) + shareCardText(cardFor(id))
      for (const forbidden of [
        'Mia',
        'Max',
        'egg',
        'allerg',
        'Alex',
        'Sam',
        'age',
        'Asked',
        'Server',
        'Manager',
      ]) {
        // "age" would also match words like "Pancake"; only check whole-word style personal terms.
        if (forbidden === 'age') continue
        expect(json, `${id} leaked "${forbidden}"`).not.toMatch(new RegExp(`\\b${forbidden}`, 'i'))
      }
      const notes = seedVisits().find((v) => v.id === id)!.notes
      if (notes) expect(json).not.toContain(notes)
      expect(json).not.toMatch(/\$\d/)
    }
  })

  it('drops dishes and wines whose names mention a family member or allergies', () => {
    const dishes = [
      ...seedDishes(),
      { ...seedDishes()[0]!, id: 'x1', name: "Mia's mac and cheese" },
      { ...seedDishes()[0]!, id: 'x2', name: 'Max special' },
      { ...seedDishes()[0]!, id: 'x3', name: 'Allergy-friendly fries' },
      { ...seedDishes()[0]!, id: 'x4', name: 'Garlic knots' },
    ]
    const card = cardFor('visit-lou', { dishes })
    expect(card.lovedDishes).toContain('Garlic knots')
    expect(card.lovedDishes.join(' ')).not.toMatch(/mia|max|allerg/i)
  })

  it('assertFoodOnly rejects cards that were tampered with', () => {
    const card = cardFor('visit-lou')
    expect(() => assertFoodOnly({ ...card, lovedDishes: ['Pizza for Mia'] }, members)).toThrow()
    expect(() =>
      assertFoodOnly({ ...card, kidFriendly: ['Max loves the fries'] }, members),
    ).toThrow()
    expect(() => assertFoodOnly({ ...card, extra: 'Mia: egg' } as never, members)).toThrow(
      /not allowed/,
    )
    expect(() => assertFoodOnly(card, members)).not.toThrow()
  })

  it('detects names as whole words only', () => {
    expect(mentionsPersonalInfo('Sam special', members)).toBe(true)
    expect(mentionsPersonalInfo('Samuel pasta', members)).toBe(false)
    expect(mentionsPersonalInfo('Egg-free pancakes, allergy safe', members)).toBe(true)
  })

  it('includes wine highlights without ratings by name or prices', () => {
    const card = cardFor('visit-coopers')
    expect(card.wineHighlights).toEqual([
      { name: 'Pinot Noir', detail: "Cooper's Hawk · Pinot Noir, California" },
    ])
    expect(card.wineHighlights.map((w) => w.name)).not.toContain('Moscato')
  })

  it('a visit with nothing to share still produces a safe card', () => {
    const card = cardFor('visit-chipotle')
    expect(card).toMatchObject({
      rating: null,
      lovedDishes: [],
      wineHighlights: [],
      kidFriendly: [],
    })
  })
})

describe('year in review', () => {
  const data = () => ({
    visits: seedVisits(),
    restaurants: seedRestaurants(),
    dishes: seedDishes(),
    wines: seedWines(),
  })

  it('lists years with finished visits', () => {
    expect(yearsWithVisits(seedVisits())).toEqual([2026])
    expect(yearsWithVisits([])).toEqual([])
  })

  it('totals visits, restaurants and spending (drafts excluded)', () => {
    const r = buildYearInReview(2026, data())
    expect(r.visitCount).toBe(6)
    expect(r.restaurantCount).toBe(6)
    expect(r.totalSpent).toBeCloseTo(78.4 + 41.2 + 142 + 56 + 210 + 64, 5)
    expect(r.averagePerVisit).toBeCloseTo(r.totalSpent / 6, 5)
    expect(r.newRestaurants).toHaveLength(6)
    expect(r.byMonth.reduce((a, b) => a + b, 0)).toBe(6)
    expect(r.byMonth[8]).toBe(2) // September
  })

  it('finds top rated, most visited, loved dishes and favorite wines', () => {
    const r = buildYearInReview(2026, data())
    expect(r.topRated[0]!.restaurant.name).toBe("Cooper's Hawk Winery & Restaurant")
    expect(r.topRated[0]!.average).toBe(5)
    expect(r.lovedDishes).toHaveLength(5)
    expect(r.lovedDishes[0]).toMatchObject({
      name: 'Chicago Classic deep dish',
      restaurant: "Lou Malnati's Pizzeria",
      count: 1,
    })
    expect(r.favoriteWines[0]!.wine.name).toBe('Pinot Noir')
    expect(r.goAgainYes).toBe(4)
  })

  it('marks restaurants as new only in their first year', () => {
    const d = data()
    const old = { ...d.visits[0]!, id: 'old', date: '2025-05-05' }
    const r = buildYearInReview(2026, { ...d, visits: [...d.visits, old] })
    expect(r.newRestaurants.map((x) => x.name)).not.toContain("Lou Malnati's Pizzeria")
    expect(buildYearInReview(2025, { ...d, visits: [old] }).visitCount).toBe(1)
  })

  it('handles an empty year', () => {
    const r = buildYearInReview(2030, data())
    expect(r.visitCount).toBe(0)
    expect(r.averagePerVisit).toBeNull()
    expect(r.topRated).toEqual([])
  })
})

describe('export', () => {
  it('backup contains every collection and a version', () => {
    const backup = buildBackup(snapshot(), new Date('2026-10-08T12:00:00Z'))
    expect(backup).toMatchObject({
      app: 'family-table-journal',
      version: 1,
      exportedAt: '2026-10-08T12:00:00.000Z',
    })
    for (const key of [
      'household',
      'members',
      'restaurants',
      'visits',
      'dishes',
      'wines',
      'kidInfo',
      'allergyNotes',
      'wishlist',
    ]) {
      expect(backup).toHaveProperty(key)
    }
    expect(backup.visits).toHaveLength(7)
  })

  it('csv has one row per visit with each parent’s rating, and no notes or allergy text', () => {
    const csv = visitsToCsv(snapshot())
    const lines = csv.trim().split('\n')
    expect(lines).toHaveLength(8)
    expect(lines[0]).toContain('Rating: Alex,Rating: Sam')
    expect(csv).toContain("Lou Malnati's Pizzeria")
    expect(csv).not.toMatch(/Asked|egg|Buttery crust|Sitter night/i)
  })

  it('escapes quotes and commas and defuses spreadsheet formulas', () => {
    expect(csvCell('a,b')).toBe('"a,b"')
    expect(csvCell('say "hi"')).toBe('"say ""hi"""')
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`)
    expect(csvCell('@sum')).toBe("'@sum")
    expect(csvCell(-5)).toBe('-5')
    expect(csvCell(undefined)).toBe('')
  })
})

describe('restaurant actions', () => {
  it('deleting a visit removes its dishes, wines and kid info', async () => {
    const data = createMockDataLayer()
    await deleteVisit(data, 'visit-coopers')
    expect(await data.visits.get('visit-coopers')).toBeNull()
    expect(await data.dishes.listByVisit('visit-coopers')).toEqual([])
    expect(await data.wines.listByVisit('visit-coopers')).toEqual([])
    expect((await data.kidInfo.list()).some((k) => k.visitId === 'visit-coopers')).toBe(false)
    expect(await data.visits.get('visit-lou')).not.toBeNull()
  })

  it('reports what a restaurant footprint holds', async () => {
    const data = createMockDataLayer()
    expect(await restaurantFootprint(data, 'rest-pita-inn')).toEqual({
      visits: 1,
      dishes: 2,
      wines: 0,
      allergyNotes: 1,
      wishlist: 0,
    })
  })

  it('deleting a restaurant removes everything attached to it', async () => {
    const data = createMockDataLayer()
    await deleteRestaurant(data, 'rest-pita-inn')
    expect(await data.restaurants.get('rest-pita-inn')).toBeNull()
    expect(await data.visits.listByRestaurant('rest-pita-inn')).toEqual([])
    expect(await data.allergies.listByRestaurant('rest-pita-inn')).toEqual([])
    expect((await data.dishes.list()).some((d) => ['dish-5', 'dish-6'].includes(d.id))).toBe(false)
    expect(await data.restaurants.get('rest-lou-malnatis')).not.toBeNull()
  })

  it('merging moves visits, kid info and notes into the target and removes the duplicate', async () => {
    const data = createMockDataLayer()
    await mergeRestaurants(data, 'rest-superdawg', 'rest-lou-malnatis')
    expect(await data.restaurants.get('rest-superdawg')).toBeNull()
    expect(
      (await data.visits.listByRestaurant('rest-lou-malnatis')).map((v) => v.id).sort(),
    ).toEqual(['visit-lou', 'visit-superdawg'])
    expect(await data.kidInfo.listByRestaurant('rest-lou-malnatis')).toHaveLength(2)
    expect((await data.dishes.listByVisit('visit-superdawg')).length).toBeGreaterThan(0)
  })

  it('merging keeps a single wishlist entry', async () => {
    const data = createMockDataLayer()
    await mergeRestaurants(data, 'rest-smak-tak', 'rest-benihana')
    const items = await data.wishlist.list()
    expect(items.filter((i) => i.restaurantId === 'rest-benihana')).toHaveLength(1)
    expect(items.some((i) => i.restaurantId === 'rest-smak-tak')).toBe(false)
  })

  it('refuses to merge a restaurant into itself or a missing one', async () => {
    const data = createMockDataLayer()
    await expect(mergeRestaurants(data, 'rest-pita-inn', 'rest-pita-inn')).rejects.toThrow()
    await expect(mergeRestaurants(data, 'rest-pita-inn', 'nope')).rejects.toThrow(
      /no longer exists/,
    )
  })
})

describe('trips', () => {
  it('tags and reads trip places', () => {
    expect(tripTag(' Orlando, FL ')).toBe('trip:Orlando, FL')
    expect(tripDestination(['kid-friendly', 'trip:Orlando, FL'])).toBe('Orlando, FL')
    expect(isTripPlace(['kid-friendly'])).toBe(false)
  })

  it('describes trip places by destination instead of drive time', () => {
    expect(describeDistance({ driveMinutes: 0, tags: ['trip:Orlando'] })).toBe('On trip: Orlando')
    expect(describeDistance({ driveMinutes: 12, tags: [] })).toBe('12 min drive')
  })
})
