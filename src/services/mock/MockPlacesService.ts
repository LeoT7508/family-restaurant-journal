import type { PlaceResult } from '@/types'
import type { PlaceSearchOptions, PlacesService } from '../PlacesService'
import { MOCK_PLACES } from './placesData'

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ']/g, '')

export class MockPlacesService implements PlacesService {
  async search(query: string, options: PlaceSearchOptions = {}): Promise<PlaceResult[]> {
    const q = norm(query.trim())
    const { maxDriveMinutes, limit = 12 } = options
    return MOCK_PLACES.filter((place) => {
      if (maxDriveMinutes !== undefined && place.driveMinutes > maxDriveMinutes) return false
      if (!q) return true
      return [place.name, place.cuisine, place.address, ...place.tags].some((field) =>
        norm(field).includes(q),
      )
    })
      .sort((a, b) => a.driveMinutes - b.driveMinutes)
      .slice(0, limit)
  }

  async getById(placeId: string): Promise<PlaceResult | null> {
    return MOCK_PLACES.find((place) => place.placeId === placeId) ?? null
  }
}
