import type { DataLayer } from '@/data/repositories'

/** Everything that hangs off a visit goes with it. */
export async function deleteVisit(data: DataLayer, visitId: string): Promise<void> {
  await data.dishes.removeByVisit(visitId)
  await data.wines.removeByVisit(visitId)
  const kid = (await data.kidInfo.list()).filter((k) => k.visitId === visitId)
  for (const k of kid) await data.kidInfo.remove(k.id)
  await data.visits.remove(visitId)
}

export interface RestaurantFootprint {
  visits: number
  dishes: number
  wines: number
  allergyNotes: number
  wishlist: number
}

/** What would be affected by deleting or merging a restaurant. Shown before the user confirms. */
export async function restaurantFootprint(
  data: DataLayer,
  restaurantId: string,
): Promise<RestaurantFootprint> {
  const visits = await data.visits.listByRestaurant(restaurantId)
  const ids = new Set(visits.map((v) => v.id))
  return {
    visits: visits.length,
    dishes: (await data.dishes.list()).filter((d) => ids.has(d.visitId)).length,
    wines: (await data.wines.list()).filter((w) => ids.has(w.visitId)).length,
    allergyNotes: (await data.allergies.listByRestaurant(restaurantId)).length,
    wishlist: (await data.wishlist.findByRestaurant(restaurantId)) ? 1 : 0,
  }
}

/** Deletes a restaurant and all of its visits, dishes, wines, kid info, allergy notes and wishlist entry. */
export async function deleteRestaurant(data: DataLayer, restaurantId: string): Promise<void> {
  for (const v of await data.visits.listByRestaurant(restaurantId)) await deleteVisit(data, v.id)
  for (const k of await data.kidInfo.listByRestaurant(restaurantId)) await data.kidInfo.remove(k.id)
  for (const a of await data.allergies.listByRestaurant(restaurantId))
    await data.allergies.remove(a.id)
  const wish = await data.wishlist.findByRestaurant(restaurantId)
  if (wish) await data.wishlist.remove(wish.id)
  await data.restaurants.remove(restaurantId)
}

/**
 * Merges a duplicate restaurant into another. Visits, kid info and allergy notes move over
 * (dishes and wines follow their visits). If both are on the wishlist, the duplicate entry is dropped.
 */
export async function mergeRestaurants(
  data: DataLayer,
  sourceId: string,
  targetId: string,
): Promise<void> {
  if (sourceId === targetId) throw new Error('Pick a different restaurant to merge into.')
  const [source, target] = await Promise.all([
    data.restaurants.get(sourceId),
    data.restaurants.get(targetId),
  ])
  if (!source || !target) throw new Error('One of those restaurants no longer exists.')

  for (const v of await data.visits.listByRestaurant(sourceId)) {
    await data.visits.update(v.id, { restaurantId: targetId })
  }
  for (const k of await data.kidInfo.listByRestaurant(sourceId)) {
    await data.kidInfo.update(k.id, { restaurantId: targetId })
  }
  for (const a of await data.allergies.listByRestaurant(sourceId)) {
    await data.allergies.update(a.id, { restaurantId: targetId })
  }
  const sourceWish = await data.wishlist.findByRestaurant(sourceId)
  if (sourceWish) {
    if (await data.wishlist.findByRestaurant(targetId)) await data.wishlist.remove(sourceWish.id)
    else await data.wishlist.update(sourceWish.id, { restaurantId: targetId })
  }
  await data.restaurants.remove(sourceId)
}
