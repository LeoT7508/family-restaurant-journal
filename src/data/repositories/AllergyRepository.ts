import type { AllergyNote } from '@/types'
import type { Repository } from './Repository'

export interface AllergyRepository extends Repository<AllergyNote> {
  listByRestaurant(restaurantId: string): Promise<AllergyNote[]>
}
