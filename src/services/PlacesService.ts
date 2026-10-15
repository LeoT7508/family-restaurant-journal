import type { PlaceResult } from '@/types'

export interface PlaceSearchOptions {
  /** Only return places within this many minutes of home. */
  maxDriveMinutes?: number
  limit?: number
}

/**
 * Finds restaurants to log. The mock searches a local list near 60601;
 * Google Places can replace it later without touching the UI.
 */
export interface PlacesService {
  search(query: string, options?: PlaceSearchOptions): Promise<PlaceResult[]>
  getById(placeId: string): Promise<PlaceResult | null>
}
