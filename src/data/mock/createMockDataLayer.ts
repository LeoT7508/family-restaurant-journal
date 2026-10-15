import type { DataLayer } from '@/data/repositories'
import { MockPlacesService } from '@/services/mock/MockPlacesService'
import {
  MockAllergyRepository,
  MockDishRepository,
  MockFamilyRepository,
  MockKidInfoRepository,
  MockRestaurantRepository,
  MockVisitRepository,
  MockWineRepository,
  MockWishlistRepository,
} from './repositories'
import { MockAuthService } from './MockAuthService'
import { MockPhotoStorage } from './MockPhotoStorage'
import { MockSyncService } from './MockSyncService'
import { resetStorage } from './LocalStorageStore'

export function createMockDataLayer(): DataLayer {
  return {
    restaurants: new MockRestaurantRepository(),
    visits: new MockVisitRepository(),
    dishes: new MockDishRepository(),
    wines: new MockWineRepository(),
    kidInfo: new MockKidInfoRepository(),
    allergies: new MockAllergyRepository(),
    wishlist: new MockWishlistRepository(),
    family: new MockFamilyRepository(),
    auth: new MockAuthService(),
    photos: new MockPhotoStorage(),
    sync: new MockSyncService(),
    places: new MockPlacesService(),
    backend: 'mock',
    devTools: {
      async resetToSeed() {
        resetStorage('seed')
        window.location.assign('/')
      },
      async resetToEmpty() {
        resetStorage('empty')
        window.location.assign('/')
      },
    },
  }
}
