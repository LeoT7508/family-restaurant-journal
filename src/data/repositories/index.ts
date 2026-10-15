export type { Repository } from './Repository'
export type { RestaurantRepository } from './RestaurantRepository'
export type { VisitRepository } from './VisitRepository'
export type { DishRepository } from './DishRepository'
export type { WineRepository } from './WineRepository'
export type { KidInfoRepository } from './KidInfoRepository'
export type { AllergyRepository } from './AllergyRepository'
export type { WishlistRepository } from './WishlistRepository'
export type { FamilyRepository } from './FamilyRepository'
export type { AuthService, Session } from './AuthService'
export type { PhotoStorage } from './PhotoStorage'
export type { AccountService, AccountState, HouseholdSetup, SignUpResult } from './AccountService'
export type { SyncService } from './SyncService'

import type { RestaurantRepository } from './RestaurantRepository'
import type { VisitRepository } from './VisitRepository'
import type { DishRepository } from './DishRepository'
import type { WineRepository } from './WineRepository'
import type { KidInfoRepository } from './KidInfoRepository'
import type { AllergyRepository } from './AllergyRepository'
import type { WishlistRepository } from './WishlistRepository'
import type { FamilyRepository } from './FamilyRepository'
import type { AuthService } from './AuthService'
import type { PhotoStorage } from './PhotoStorage'
import type { AccountService } from './AccountService'
import type { SyncService } from './SyncService'
import type { PlacesService } from '@/services/PlacesService'

/** The result of asking the back end "are you there, do you accept our key, are the tables set up?" */
export interface ConnectionStatus {
  reachable: boolean
  keyAccepted: boolean
  tablesReady: boolean
  detail?: string
}

/** Lets the app show whether the back end is working. Only real back ends provide it. */
export interface ConnectionService {
  /** The project address, shown so you can see which project you're talking to. */
  host: string
  check(): Promise<ConnectionStatus>
}

/** Developer helpers that only exist for the mock (hidden in Profile when absent). */
export interface DevTools {
  /** Restore the sample data, then reload. */
  resetToSeed(): Promise<void>
  /** Keep the family but clear all journal data (the first-run experience), then reload. */
  resetToEmpty(): Promise<void>
}

/** Everything the UI needs from the outside world. One object, provided once by DataProvider. */
export interface DataLayer {
  restaurants: RestaurantRepository
  visits: VisitRepository
  dishes: DishRepository
  wines: WineRepository
  kidInfo: KidInfoRepository
  allergies: AllergyRepository
  wishlist: WishlistRepository
  family: FamilyRepository
  auth: AuthService
  photos: PhotoStorage
  sync: SyncService
  places: PlacesService
  /** Which implementation is behind this layer, shown in Profile. */
  backend: 'mock' | 'supabase'
  /** Sign-in and household setup. Absent for the mock. */
  account?: AccountService
  /** Connection check. Absent for the mock. */
  connection?: ConnectionService
  devTools?: DevTools
}
