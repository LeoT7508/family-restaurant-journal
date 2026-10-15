import type { PlaceResult, Restaurant } from '@/types'
import type { Repository } from './Repository'

/** Restaurants the family has saved (visited or on the wishlist). */
export interface RestaurantRepository extends Repository<Restaurant> {
  findByPlaceId(placeId: string): Promise<Restaurant | null>
  /** Returns the saved restaurant for this place, creating it if the family hasn't saved it yet. */
  upsertFromPlace(place: PlaceResult): Promise<Restaurant>
}
