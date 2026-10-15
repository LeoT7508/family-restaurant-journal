import type { DishEntry } from '@/types'
import type { Repository } from './Repository'

export interface DishRepository extends Repository<DishEntry> {
  listByVisit(visitId: string): Promise<DishEntry[]>
  /** Removes every dish belonging to a visit (used when a visit is deleted). */
  removeByVisit(visitId: string): Promise<void>
}
