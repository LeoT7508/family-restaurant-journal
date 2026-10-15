import type { SupabaseClient } from '@supabase/supabase-js'
import type { DataLayer, SyncService } from '@/data/repositories'
import { MockPlacesService } from '@/services/mock/MockPlacesService'
import { createSupabaseClient, supabaseCredentials, supabaseHost } from './client'
import { checkBackend } from './health'
import {
  SupabaseAllergyRepository,
  SupabaseDishRepository,
  SupabaseFamilyRepository,
  SupabaseKidInfoRepository,
  SupabaseRestaurantRepository,
  SupabaseVisitRepository,
  SupabaseWineRepository,
  SupabaseWishlistRepository,
} from './repositories'
import { SupabaseAccountService } from './SupabaseAccountService'
import { SupabaseAuthService } from './SupabaseAuthService'
import { SupabasePhotoStorage } from './SupabasePhotoStorage'
import { SupabaseHouseholdScope, type HouseholdScope } from './scope'

/** Writes go straight to the server for now, so nothing waits to sync. Offline queueing comes later. */
const onlineOnlySync: SyncService = {
  async getPendingCount() {
    return 0
  },
  async syncNow() {},
}

export function buildSupabaseDataLayer(client: SupabaseClient, scope: HouseholdScope): DataLayer {
  return {
    restaurants: new SupabaseRestaurantRepository(client, scope),
    visits: new SupabaseVisitRepository(client, scope),
    dishes: new SupabaseDishRepository(client, scope),
    wines: new SupabaseWineRepository(client, scope),
    kidInfo: new SupabaseKidInfoRepository(client, scope),
    allergies: new SupabaseAllergyRepository(client, scope),
    wishlist: new SupabaseWishlistRepository(client, scope),
    family: new SupabaseFamilyRepository(client, scope),
    auth: new SupabaseAuthService(client, scope),
    account: new SupabaseAccountService(client, scope),
    photos: new SupabasePhotoStorage(client, scope),
    sync: onlineOnlySync,
    // Still the local sample list; Google Places replaces this later.
    places: new MockPlacesService(),
    backend: 'supabase',
    connection: {
      host: supabaseHost,
      check: () => checkBackend(supabaseCredentials.url ?? '', supabaseCredentials.key ?? ''),
    },
  }
}

export function createSupabaseDataLayer(): DataLayer {
  const client = createSupabaseClient()
  return buildSupabaseDataLayer(client, new SupabaseHouseholdScope(client))
}
