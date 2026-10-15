import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  AllergyRepository,
  DishRepository,
  FamilyRepository,
  KidInfoRepository,
  RestaurantRepository,
  VisitRepository,
  WineRepository,
  WishlistRepository,
} from '@/data/repositories'
import {
  allergyNoteSchema,
  dishEntrySchema,
  familyMemberSchema,
  householdSchema,
  kidInfoSchema,
  restaurantSchema,
  visitSchema,
  wineEntrySchema,
  wishlistItemSchema,
  type AllergyNote,
  type DishEntry,
  type FamilyMember,
  type Household,
  type KidInfo,
  type NewRecord,
  type PlaceResult,
  type Restaurant,
  type Visit,
  type WineEntry,
  type WishlistItem,
} from '@/types'
import { friendlyError, patchToRow, rowToRecord } from './mapping'
import type { HouseholdScope } from './scope'
import { SupabaseRepository } from './SupabaseRepository'

export class SupabaseRestaurantRepository
  extends SupabaseRepository<Restaurant>
  implements RestaurantRepository
{
  constructor(client: SupabaseClient, scope: HouseholdScope) {
    super(client, 'restaurants', scope, restaurantSchema)
  }
  findByPlaceId(placeId: string): Promise<Restaurant | null> {
    return this.findWhere('place_id', placeId)
  }
  async upsertFromPlace(place: PlaceResult): Promise<Restaurant> {
    const existing = await this.findByPlaceId(place.placeId)
    if (existing) return existing
    try {
      return await this.create({ ...place, status: 'open' })
    } catch (error) {
      // Two devices saved the same place at once: the unique key stopped the second, so use the first.
      const winner = await this.findByPlaceId(place.placeId)
      if (winner) return winner
      throw error
    }
  }
}

export class SupabaseVisitRepository extends SupabaseRepository<Visit> implements VisitRepository {
  constructor(client: SupabaseClient, scope: HouseholdScope) {
    super(client, 'visits', scope, visitSchema)
  }
  listByRestaurant(restaurantId: string): Promise<Visit[]> {
    return this.listWhere('restaurant_id', restaurantId)
  }
}

export class SupabaseDishRepository
  extends SupabaseRepository<DishEntry>
  implements DishRepository
{
  constructor(client: SupabaseClient, scope: HouseholdScope) {
    super(client, 'dishes', scope, dishEntrySchema)
  }
  listByVisit(visitId: string): Promise<DishEntry[]> {
    return this.listWhere('visit_id', visitId)
  }
  removeByVisit(visitId: string): Promise<void> {
    return this.removeWhere('visit_id', visitId)
  }
}

export class SupabaseWineRepository
  extends SupabaseRepository<WineEntry>
  implements WineRepository
{
  constructor(client: SupabaseClient, scope: HouseholdScope) {
    super(client, 'wines', scope, wineEntrySchema)
  }
  listByVisit(visitId: string): Promise<WineEntry[]> {
    return this.listWhere('visit_id', visitId)
  }
  removeByVisit(visitId: string): Promise<void> {
    return this.removeWhere('visit_id', visitId)
  }
}

export class SupabaseKidInfoRepository
  extends SupabaseRepository<KidInfo>
  implements KidInfoRepository
{
  constructor(client: SupabaseClient, scope: HouseholdScope) {
    super(client, 'kid_info', scope, kidInfoSchema)
  }
  listByRestaurant(restaurantId: string): Promise<KidInfo[]> {
    return this.listWhere('restaurant_id', restaurantId)
  }
}

export class SupabaseAllergyRepository
  extends SupabaseRepository<AllergyNote>
  implements AllergyRepository
{
  constructor(client: SupabaseClient, scope: HouseholdScope) {
    super(client, 'allergy_notes', scope, allergyNoteSchema)
  }
  listByRestaurant(restaurantId: string): Promise<AllergyNote[]> {
    return this.listWhere('restaurant_id', restaurantId)
  }
}

export class SupabaseWishlistRepository
  extends SupabaseRepository<WishlistItem>
  implements WishlistRepository
{
  constructor(client: SupabaseClient, scope: HouseholdScope) {
    super(client, 'wishlist_items', scope, wishlistItemSchema)
  }
  findByRestaurant(restaurantId: string): Promise<WishlistItem | null> {
    return this.findWhere('restaurant_id', restaurantId)
  }
}

/** The household's `travel_destination` column is the app's `travel: { destination }` object. */
const householdFromRow = (row: Record<string, unknown>): Record<string, unknown> => {
  const record = rowToRecord(row)
  const destination = record.travelDestination
  delete record.travelDestination
  record.travel = typeof destination === 'string' && destination ? { destination } : undefined
  return record
}

export class SupabaseFamilyRepository implements FamilyRepository {
  private readonly members: SupabaseRepository<FamilyMember>

  constructor(
    private readonly client: SupabaseClient,
    private readonly scope: HouseholdScope,
  ) {
    this.members = new SupabaseRepository(client, 'family_members', scope, familyMemberSchema)
  }

  async getHousehold(): Promise<Household> {
    const id = await this.scope.householdId()
    const { data, error } = await this.client.from('households').select('*').eq('id', id).single()
    if (error) throw friendlyError(error)
    const result = householdSchema.safeParse(householdFromRow(data as Record<string, unknown>))
    if (!result.success)
      throw new Error('The server sent household data this app does not understand.')
    return result.data
  }

  async updateHousehold(patch: Partial<NewRecord<Household>>): Promise<Household> {
    const id = await this.scope.householdId()
    const { travel, ...rest } = patch
    const row = patchToRow(rest)
    if ('travel' in patch) row.travel_destination = travel?.destination ?? null
    const { error } = await this.client.from('households').update(row).eq('id', id)
    if (error) throw friendlyError(error)
    return this.getHousehold()
  }

  listMembers(): Promise<FamilyMember[]> {
    return this.members.list()
  }
  getMember(id: string): Promise<FamilyMember | null> {
    return this.members.get(id)
  }
  createMember(input: NewRecord<FamilyMember>): Promise<FamilyMember> {
    return this.members.create({ ...input, isParent: input.role === 'parent' })
  }
  updateMember(id: string, patch: Partial<NewRecord<FamilyMember>>): Promise<FamilyMember> {
    const next = patch.role ? { ...patch, isParent: patch.role === 'parent' } : patch
    return this.members.update(id, next)
  }
  removeMember(id: string): Promise<void> {
    return this.members.remove(id)
  }
}
