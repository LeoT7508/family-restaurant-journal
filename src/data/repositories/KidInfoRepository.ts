import type { KidInfo } from '@/types'
import type { Repository } from './Repository'

export interface KidInfoRepository extends Repository<KidInfo> {
  listByRestaurant(restaurantId: string): Promise<KidInfo[]>
}
