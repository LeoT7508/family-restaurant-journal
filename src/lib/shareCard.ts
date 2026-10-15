import type { DishEntry, FamilyMember, KidInfo, Restaurant, Visit, WineEntry } from '@/types'
import { isFavoriteWine, wineAverage } from './wine'

/**
 * SHARE CARDS ARE FOOD-ONLY. This is a hard rule in code, not a setting.
 *
 * A share card can only ever contain what is listed in `ShareCard`: the restaurant, loved dishes,
 * wine highlights, a rating, and kid-friendly facts about the restaurant. It is built by picking
 * fields one at a time (never by copying a visit), the renderer only accepts a `ShareCard`, and
 * `assertFoodOnly` re-checks the finished card. Allergy notes, children's names, ages, favorites
 * per child and free-text notes have no path into it.
 */
export interface ShareCard {
  restaurant: string
  cuisine: string
  /** 1-4 */
  priceLevel: number
  /** Family rating out of 5, or null when nobody rated it. */
  rating: number | null
  lovedDishes: string[]
  wineHighlights: { name: string; detail: string }[]
  /** Facts about the restaurant such as "Kids' menu". Never anything about a specific child. */
  kidFriendly: string[]
}

/** The only keys a share card may have. Tests lock this list. */
export const SHARE_CARD_KEYS = [
  'restaurant',
  'cuisine',
  'priceLevel',
  'rating',
  'lovedDishes',
  'wineHighlights',
  'kidFriendly',
] as const

const KID_FLAG_LABELS: [keyof KidInfo, string][] = [
  ['kidsMenu', "Kids' menu"],
  ['highChair', 'High chairs'],
  ['roomForStroller', 'Room for strollers'],
  ['quickService', 'Quick service'],
]

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** True if free text mentions a family member by name or talks about allergies. */
export function mentionsPersonalInfo(text: string, members: Pick<FamilyMember, 'name'>[]): boolean {
  if (/allerg/i.test(text)) return true
  return members.some((m) => {
    const name = m.name.trim()
    return (
      name.length > 1 &&
      new RegExp(`(^|[^\\p{L}])${escapeRegex(name)}($|[^\\p{L}])`, 'iu').test(text)
    )
  })
}

function allText(card: ShareCard): string[] {
  return [
    card.restaurant,
    card.cuisine,
    ...card.lovedDishes,
    ...card.wineHighlights.flatMap((w) => [w.name, w.detail]),
    ...card.kidFriendly,
  ]
}

/** Defense in depth: throws if the finished card mentions anyone in the family or allergies. */
export function assertFoodOnly(card: ShareCard, members: Pick<FamilyMember, 'name'>[]): void {
  const keys = Object.keys(card).sort().join(',')
  if (keys !== [...SHARE_CARD_KEYS].sort().join(',')) {
    throw new Error('Share card has fields that are not allowed.')
  }
  for (const text of allText(card)) {
    if (mentionsPersonalInfo(text, members)) {
      throw new Error('Share card contains personal or allergy information.')
    }
  }
}

function familyRating(visit: Visit): number | null {
  if (visit.familyRating) return visit.familyRating
  const parent = Object.values(visit.ratings)
  if (parent.length === 0) return null
  return Math.round((parent.reduce((a, b) => a + b, 0) / parent.length) * 2) / 2
}

interface BuildInput {
  visit: Visit
  restaurant: Restaurant
  dishes: DishEntry[]
  wines: WineEntry[]
  kidInfo: KidInfo[]
  members: FamilyMember[]
}

export function buildShareCard({
  visit,
  restaurant,
  dishes,
  wines,
  kidInfo,
  members,
}: BuildInput): ShareCard {
  const safe = (text: string) => !mentionsPersonalInfo(text, members)

  const lovedDishes = [
    ...new Set(
      dishes
        .filter((d) => d.visitId === visit.id && Object.values(d.verdicts).includes('loved'))
        .map((d) => d.name.trim())
        .filter((name) => name && safe(name)),
    ),
  ].slice(0, 5)

  const wineHighlights = wines
    .filter((w) => w.visitId === visit.id && (isFavoriteWine(w) || (wineAverage(w) ?? 0) >= 4))
    .map((w) => ({
      name: w.name.trim(),
      detail: [w.producer, w.grapeOrRegion]
        .map((x) => x.trim())
        .filter(Boolean)
        .join(' · '),
    }))
    .filter((w) => w.name && safe(w.name) && safe(w.detail))
    .slice(0, 3)

  const records = kidInfo.filter((k) => k.restaurantId === restaurant.id)
  const kidFriendly = KID_FLAG_LABELS.filter(([key]) => records.some((k) => k[key] === true)).map(
    ([, label]) => label,
  )

  const card: ShareCard = {
    restaurant: restaurant.name,
    cuisine: restaurant.cuisine,
    priceLevel: restaurant.priceLevel,
    rating: familyRating(visit),
    lovedDishes,
    wineHighlights,
    kidFriendly,
  }
  assertFoodOnly(card, members)
  return card
}

/** Plain text version for copy / the system share sheet. */
export function shareCardText(card: ShareCard): string {
  const lines = [
    `${card.restaurant} (${card.cuisine}, ${'$'.repeat(card.priceLevel)})`,
    card.rating !== null ? `Rating: ${card.rating}/5` : '',
    card.lovedDishes.length ? `Loved: ${card.lovedDishes.join(', ')}` : '',
    card.wineHighlights.length
      ? `Wine: ${card.wineHighlights.map((w) => (w.detail ? `${w.name} (${w.detail})` : w.name)).join('; ')}`
      : '',
    card.kidFriendly.length ? `Kid-friendly: ${card.kidFriendly.join(', ')}` : '',
  ]
  return lines.filter(Boolean).join('\n')
}
