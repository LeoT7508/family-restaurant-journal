import type { DishEntry, Restaurant, Visit, WineEntry } from '@/types'
import { wineAverage } from './wine'

export interface YearInReview {
  year: number
  visitCount: number
  restaurantCount: number
  newRestaurants: Restaurant[]
  totalSpent: number
  averagePerVisit: number | null
  averagePerPerson: number | null
  topRated: { restaurant: Restaurant; average: number }[]
  mostVisited: { restaurant: Restaurant; count: number }[]
  topCuisines: { cuisine: string; count: number }[]
  lovedDishes: { name: string; restaurant: string; count: number }[]
  favoriteWines: { wine: WineEntry; restaurant: string; average: number }[]
  /** Visits per month, January first. */
  byMonth: number[]
  occasions: { name: string; count: number }[]
  goAgainYes: number
}

const yearOf = (iso: string) => Number(iso.slice(0, 4))
const monthOf = (iso: string) => Number(iso.slice(5, 7)) - 1
const tally = <T>(items: T[], key: (t: T) => string) => {
  const map = new Map<string, number>()
  for (const item of items) map.set(key(item), (map.get(key(item)) ?? 0) + 1)
  return map
}
const top = <K>(entries: [K, number][], n: number) =>
  entries.sort((a, b) => b[1] - a[1]).slice(0, n)

/** Years that have at least one finished visit, newest first. */
export function yearsWithVisits(visits: Visit[]): number[] {
  return [...new Set(visits.filter((v) => !v.isDraft).map((v) => yearOf(v.date)))].sort(
    (a, b) => b - a,
  )
}

export function visitScore(v: Visit): number | null {
  const parent = Object.values(v.ratings)
  if (parent.length > 0) return parent.reduce((a, b) => a + b, 0) / parent.length
  return v.familyRating ?? null
}

export function buildYearInReview(
  year: number,
  data: { visits: Visit[]; restaurants: Restaurant[]; dishes: DishEntry[]; wines: WineEntry[] },
): YearInReview {
  const byId = new Map(data.restaurants.map((r) => [r.id, r]))
  const finished = data.visits.filter((v) => !v.isDraft && byId.has(v.restaurantId))
  const inYear = finished.filter((v) => yearOf(v.date) === year)
  const nameOfRestaurant = (visitId: string) =>
    byId.get(inYear.find((v) => v.id === visitId)?.restaurantId ?? '')?.name ?? ''

  const restaurantIds = new Set(inYear.map((v) => v.restaurantId))
  const firstYear = new Map<string, number>()
  for (const v of finished) {
    const y = yearOf(v.date)
    firstYear.set(v.restaurantId, Math.min(firstYear.get(v.restaurantId) ?? y, y))
  }
  const newRestaurants = [...restaurantIds]
    .filter((id) => firstYear.get(id) === year)
    .map((id) => byId.get(id)!)

  const spent = inYear.filter((v) => v.amountSpent !== undefined)
  const totalSpent = spent.reduce((sum, v) => sum + (v.amountSpent ?? 0), 0)
  const perPerson = inYear.filter((v) => v.amountSpent !== undefined && v.partySize)
  const averagePerPerson = perPerson.length
    ? perPerson.reduce((sum, v) => sum + v.amountSpent! / v.partySize!, 0) / perPerson.length
    : null

  const ratingByRestaurant = new Map<string, number[]>()
  for (const v of inYear) {
    const score = visitScore(v)
    if (score !== null)
      ratingByRestaurant.set(v.restaurantId, [
        ...(ratingByRestaurant.get(v.restaurantId) ?? []),
        score,
      ])
  }
  const topRated = [...ratingByRestaurant.entries()]
    .map(([id, scores]) => ({
      restaurant: byId.get(id)!,
      average: scores.reduce((a, b) => a + b, 0) / scores.length,
    }))
    .sort((a, b) => b.average - a.average || a.restaurant.name.localeCompare(b.restaurant.name))
    .slice(0, 3)

  const visitCounts = tally(inYear, (v) => v.restaurantId)
  const mostVisited = top([...visitCounts.entries()], 3).map(([id, count]) => ({
    restaurant: byId.get(id)!,
    count,
  }))

  const topCuisines = top(
    [...tally(inYear, (v) => byId.get(v.restaurantId)!.cuisine).entries()],
    3,
  ).map(([cuisine, count]) => ({ cuisine, count }))

  const yearVisitIds = new Set(inYear.map((v) => v.id))
  const lovedByName = new Map<string, { name: string; restaurant: string; count: number }>()
  for (const d of data.dishes) {
    if (!yearVisitIds.has(d.visitId) || !Object.values(d.verdicts).includes('loved')) continue
    const key = `${d.name.toLowerCase()}|${nameOfRestaurant(d.visitId)}`
    const current = lovedByName.get(key)
    lovedByName.set(key, {
      name: d.name,
      restaurant: nameOfRestaurant(d.visitId),
      count: (current?.count ?? 0) + 1,
    })
  }
  const lovedDishes = [...lovedByName.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 5)

  const favoriteWines = data.wines
    .filter((w) => yearVisitIds.has(w.visitId))
    .map((w) => ({ wine: w, restaurant: nameOfRestaurant(w.visitId), average: wineAverage(w) }))
    .filter(
      (w): w is { wine: WineEntry; restaurant: string; average: number } => w.average !== null,
    )
    .sort((a, b) => b.average - a.average || a.wine.name.localeCompare(b.wine.name))
    .slice(0, 3)

  const byMonth = Array.from({ length: 12 }, () => 0)
  for (const v of inYear) byMonth[monthOf(v.date)] = (byMonth[monthOf(v.date)] ?? 0) + 1

  const occasions = top(
    [
      ...tally(
        inYear.flatMap((v) => v.occasions),
        (o) => o,
      ).entries(),
    ],
    5,
  ).map(([name, count]) => ({ name, count }))

  return {
    year,
    visitCount: inYear.length,
    restaurantCount: restaurantIds.size,
    newRestaurants,
    totalSpent,
    averagePerVisit: spent.length ? totalSpent / spent.length : null,
    averagePerPerson,
    topRated,
    mostVisited,
    topCuisines,
    lovedDishes,
    favoriteWines,
    byMonth,
    occasions,
    goAgainYes: inYear.filter((v) => v.goAgain === 'yes').length,
  }
}
