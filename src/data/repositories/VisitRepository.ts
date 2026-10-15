import type { Visit } from '@/types'
import type { Repository } from './Repository'

export interface VisitRepository extends Repository<Visit> {
  listByRestaurant(restaurantId: string): Promise<Visit[]>
}
