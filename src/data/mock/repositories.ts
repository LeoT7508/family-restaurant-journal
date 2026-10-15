import type {
  AllergyNote,
  DishEntry,
  FamilyMember,
  Household,
  KidInfo,
  NewRecord,
  PlaceResult,
  Restaurant,
  Visit,
  WineEntry,
  WishlistItem,
} from '@/types'
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
} from '@/types'
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
import { LocalStorageStore } from './LocalStorageStore'
import { MockRepository, NotFoundError } from './MockRepository'
import { seedHousehold, seedMembers } from './seed/family'
import {
  seedAllergyNotes,
  seedDishes,
  seedKidInfo,
  seedRestaurants,
  seedVisits,
  seedWines,
  seedWishlist,
} from './seed/journal'

export class MockRestaurantRepository
  extends MockRepository<Restaurant>
  implements RestaurantRepository
{
  constructor() {
    super(new LocalStorageStore('restaurants', restaurantSchema, seedRestaurants), 'Restaurant')
  }
  async findByPlaceId(placeId: string): Promise<Restaurant | null> {
    return this.store.all().find((r) => r.placeId === placeId) ?? null
  }
  async upsertFromPlace(place: PlaceResult): Promise<Restaurant> {
    const existing = await this.findByPlaceId(place.placeId)
    if (existing) return existing
    return this.create({ ...place, status: 'open' })
  }
}

export class MockVisitRepository extends MockRepository<Visit> implements VisitRepository {
  constructor() {
    super(new LocalStorageStore('visits', visitSchema, seedVisits), 'Visit')
  }
  async listByRestaurant(restaurantId: string): Promise<Visit[]> {
    return this.store.all().filter((v) => v.restaurantId === restaurantId)
  }
}

export class MockDishRepository extends MockRepository<DishEntry> implements DishRepository {
  constructor() {
    super(new LocalStorageStore('dishes', dishEntrySchema, seedDishes), 'Dish')
  }
  async listByVisit(visitId: string): Promise<DishEntry[]> {
    return this.store.all().filter((d) => d.visitId === visitId)
  }
  async removeByVisit(visitId: string): Promise<void> {
    this.store.replaceAll(this.store.all().filter((d) => d.visitId !== visitId))
  }
}

export class MockWineRepository extends MockRepository<WineEntry> implements WineRepository {
  constructor() {
    super(new LocalStorageStore('wines', wineEntrySchema, seedWines), 'Wine')
  }
  async listByVisit(visitId: string): Promise<WineEntry[]> {
    return this.store.all().filter((w) => w.visitId === visitId)
  }
  async removeByVisit(visitId: string): Promise<void> {
    this.store.replaceAll(this.store.all().filter((w) => w.visitId !== visitId))
  }
}

export class MockKidInfoRepository extends MockRepository<KidInfo> implements KidInfoRepository {
  constructor() {
    super(new LocalStorageStore('kidInfo', kidInfoSchema, seedKidInfo), 'Kid info')
  }
  async listByRestaurant(restaurantId: string): Promise<KidInfo[]> {
    return this.store.all().filter((k) => k.restaurantId === restaurantId)
  }
}

export class MockAllergyRepository
  extends MockRepository<AllergyNote>
  implements AllergyRepository
{
  constructor() {
    super(new LocalStorageStore('allergies', allergyNoteSchema, seedAllergyNotes), 'Allergy note')
  }
  async listByRestaurant(restaurantId: string): Promise<AllergyNote[]> {
    return this.store.all().filter((a) => a.restaurantId === restaurantId)
  }
}

export class MockWishlistRepository
  extends MockRepository<WishlistItem>
  implements WishlistRepository
{
  constructor() {
    super(new LocalStorageStore('wishlist', wishlistItemSchema, seedWishlist), 'Wishlist item')
  }
  async findByRestaurant(restaurantId: string): Promise<WishlistItem | null> {
    return this.store.all().find((w) => w.restaurantId === restaurantId) ?? null
  }
}

export class MockFamilyRepository implements FamilyRepository {
  private readonly households = new MockRepository<Household>(
    new LocalStorageStore('household', householdSchema, seedHousehold),
    'Household',
  )
  private readonly members = new MockRepository<FamilyMember>(
    new LocalStorageStore('members', familyMemberSchema, seedMembers),
    'Family member',
  )

  async getHousehold(): Promise<Household> {
    const [household] = await this.households.list()
    if (!household) throw new NotFoundError('Household', 'default')
    return household
  }
  async updateHousehold(patch: Partial<NewRecord<Household>>): Promise<Household> {
    const current = await this.getHousehold()
    return this.households.update(current.id, patch)
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
