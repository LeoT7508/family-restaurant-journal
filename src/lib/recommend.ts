import type {
  DishEntry,
  FamilyMember,
  KidInfo,
  PlaceResult,
  Restaurant,
  Visit,
  WineEntry,
  WishlistItem,
} from '@/types'
import { restaurantIdsWithSafeNotes } from './allergy'
import { kidFriendlyRestaurantIds } from './journal'
import { sameDestination, tripDestination } from './trip'

export interface TonightAnswers {
  /** Cuisines in the mood for. Empty means anything. */
  cuisines: string[]
  maxDriveMinutes: number
  kidFriendly: boolean
  /** Only places where the family's own notes mention a dish Mia ate fine. */
  safeForAllergy: boolean
  quickService: boolean
  wineList: boolean
}

export const DEFAULT_ANSWERS: TonightAnswers = {
  cuisines: [],
  maxDriveMinutes: 20,
  kidFriendly: false,
  safeForAllergy: false,
  quickService: false,
  wineList: false,
}

export type SuggestionSource = 'journal' | 'wishlist' | 'new'

export interface Suggestion {
  /** The placeId, stable across saved and unsaved places. */
  key: string
  source: SuggestionSource
  place: PlaceResult
  /** Present when the family has saved this restaurant. */
  restaurant?: Restaurant
  wishlistItem?: WishlistItem
  reasons: string[]
  score: number
}

export interface RecommendContext {
  restaurants: Restaurant[]
  visits: Visit[]
  dishes: DishEntry[]
  wines: WineEntry[]
  kidInfo: KidInfo[]
  wishlist: WishlistItem[]
  members: FamilyMember[]
  /** Everything a places search can return (the mock list, later Google Places). */
  places: PlaceResult[]
  /** Travel mode: only suggest places saved on a trip to this destination, and ignore drive time. */
  travelDestination?: string
  now?: Date
}

export interface RecommendOptions {
  limit?: number
  /** Place keys to leave out (for "show me different ones"). */
  exclude?: ReadonlySet<string>
  /** Home-screen ideas come from history only; "Where tonight?" may add new places to fill gaps. */
  includeNew?: boolean
}

const DAY = 86_400_000

const parseDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1)
}

const toPlace = (r: Restaurant): PlaceResult => ({
  placeId: r.placeId,
  name: r.name,
  address: r.address,
  cuisine: r.cuisine,
  priceLevel: r.priceLevel,
  driveMinutes: r.driveMinutes,
  tags: r.tags,
})

const monthYear = (d: Date) => d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
const stars = (n: number) =>
  `${Number.isInteger(n) ? n : n.toFixed(1)} ${n === 1 ? 'star' : 'stars'}`

/** Average of the parents' ratings across visits, falling back to the family rating. */
function averageRating(visits: Visit[]): number | null {
  const parent = visits.flatMap((v) => Object.values(v.ratings))
  const pool =
    parent.length > 0 ? parent : visits.flatMap((v) => (v.familyRating ? [v.familyRating] : []))
  if (pool.length === 0) return null
  return pool.reduce((a, b) => a + b, 0) / pool.length
}

/**
 * Picks places to eat from the family's own history. Pure and deterministic.
 * Journal and wishlist places always rank ahead of brand-new ones.
 * It never says a place is safe for anyone: the Mia option reads only the family's dish notes.
 */
export function recommend(
  answers: TonightAnswers,
  ctx: RecommendContext,
  options: RecommendOptions = {},
): { suggestions: Suggestion[]; fromHistory: number } {
  const { limit = 3, exclude, includeNew = true } = options
  const now = ctx.now ?? new Date()
  const allergic = ctx.members.find((m) => m.allergies.length > 0)

  const kidIds = kidFriendlyRestaurantIds(ctx.restaurants, ctx.kidInfo)
  const safeIds = restaurantIdsWithSafeNotes(ctx.dishes, ctx.visits)
  const wishByRestaurant = new Map(ctx.wishlist.map((w) => [w.restaurantId, w]))
  const savedByPlace = new Map(ctx.restaurants.map((r) => [r.placeId, r]))
  const nameOf = (id: string) => ctx.members.find((m) => m.id === id)?.name

  const wantCuisines = new Set(answers.cuisines.map((c) => c.toLowerCase()))

  const build = (place: PlaceResult, restaurant: Restaurant | undefined): Suggestion | null => {
    if (exclude?.has(place.placeId)) return null
    if (restaurant?.status === 'closed') return null
    const trip = tripDestination(place.tags)
    const travelling = Boolean(ctx.travelDestination)
    if (travelling) {
      // Away from home: only places from this trip count, and drive time from home means nothing.
      if (!trip || !sameDestination(trip, ctx.travelDestination!)) return null
    } else {
      if (trip) return null // trip places never show up as "near home"
      if (place.driveMinutes > answers.maxDriveMinutes) return null
    }
    if (wantCuisines.size > 0 && !wantCuisines.has(place.cuisine.toLowerCase())) return null

    const visits = restaurant
      ? ctx.visits
          .filter((v) => v.restaurantId === restaurant.id)
          .sort((a, b) => b.date.localeCompare(a.date))
      : []
    const finished = visits.filter((v) => !v.isDraft)
    const latest = visits[0]
    const wish = restaurant ? wishByRestaurant.get(restaurant.id) : undefined
    const loggedWines = restaurant
      ? ctx.wines.filter((w) => visits.some((v) => v.id === w.visitId))
      : []

    // Said "never" last time: leave it out entirely.
    const lastAnswer = visits.find((v) => v.goAgain)?.goAgain
    if (lastAnswer === 'never') return null

    const kidFriendly = restaurant ? kidIds.has(restaurant.id) : place.tags.includes('kid-friendly')
    const quick =
      place.tags.includes('quick-service') ||
      (restaurant
        ? ctx.kidInfo.some((k) => k.restaurantId === restaurant.id && k.quickService)
        : false)
    const hasWine = place.tags.includes('wine-list') || loggedWines.length > 0
    const safeNotes = restaurant ? safeIds.has(restaurant.id) : false

    if (answers.kidFriendly && !kidFriendly) return null
    if (answers.quickService && !quick) return null
    if (answers.wineList && !hasWine) return null
    // Only the family's own past notes can satisfy this, so brand-new places never match.
    if (answers.safeForAllergy && !safeNotes) return null

    const source: SuggestionSource = visits.length > 0 ? 'journal' : wish ? 'wishlist' : 'new'
    if (source === 'new' && restaurant) return null // saved but never visited or wishlisted
    if (source === 'new' && !includeNew) return null

    let score = source === 'journal' ? 40 : source === 'wishlist' ? 30 : 0
    const reasons: string[] = []

    const avg = averageRating(finished)
    if (source === 'journal' && latest) {
      const when = monthYear(parseDate(latest.date))
      reasons.push(
        avg !== null
          ? `You went in ${when} and rated it ${stars(Math.round(avg * 10) / 10)} on average`
          : `You went in ${when}`,
      )
      if (avg !== null) score += avg * 5
    }
    if (lastAnswer === 'yes') {
      score += 12
      reasons.push("You said you'd go again")
    } else if (lastAnswer === 'maybe') {
      score += 3
    }
    if (wish) {
      score += source === 'wishlist' ? 0 : 4
      const by = nameOf(wish.addedBy)
      reasons.push(`On your wishlist${by ? `, added by ${by}` : ''}`)
    }
    if (source === 'journal' && latest) {
      const days = (now.getTime() - parseDate(latest.date).getTime()) / DAY
      if (days < 10) {
        score -= 20
        reasons.push('You were here very recently')
      } else if (days < 30) {
        score -= 5
      } else if (days >= 60) {
        score += 6
        reasons.push(`Haven't been in ${Math.floor(days / 30)} months`)
      }
    }
    if (source === 'new') reasons.push('New to you')

    if (trip) {
      reasons.push(`On your ${trip} trip`)
    } else {
      score += ((answers.maxDriveMinutes - place.driveMinutes) / answers.maxDriveMinutes) * 6
      reasons.push(`${place.driveMinutes} min away`)
    }

    if (kidFriendly && (answers.kidFriendly || restaurant)) reasons.push('Kid-friendly')
    if (quick && answers.quickService) reasons.push('Quick service')
    if (hasWine && (answers.wineList || loggedWines.length > 0)) {
      reasons.push(loggedWines.length > 0 ? 'You have wine notes here' : 'Has a wine list')
    }
    if (safeNotes && allergic) {
      reasons.push(
        `${allergic.name} ate a dish here fine, per your notes. Confirm with the restaurant again.`,
      )
    }

    return {
      key: place.placeId,
      source,
      place,
      restaurant,
      wishlistItem: wish,
      reasons: reasons.slice(0, 5),
      score,
    }
  }

  const candidates: Suggestion[] = []
  for (const r of ctx.restaurants) {
    const s = build(toPlace(r), r)
    if (s) candidates.push(s)
  }
  if (includeNew && !ctx.travelDestination) {
    for (const place of ctx.places) {
      if (savedByPlace.has(place.placeId)) continue
      const s = build(place, undefined)
      if (s) candidates.push(s)
    }
  }

  const rank = (a: Suggestion, b: Suggestion) =>
    b.score - a.score || a.place.name.localeCompare(b.place.name)
  const history = candidates.filter((c) => c.source !== 'new').sort(rank)
  const fresh = candidates.filter((c) => c.source === 'new').sort(rank)

  const picked = [...history.slice(0, limit)]
  for (const s of fresh) {
    if (picked.length >= limit) break
    picked.push(s)
  }
  return { suggestions: picked, fromHistory: Math.min(history.length, limit) }
}
