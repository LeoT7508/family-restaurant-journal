import type { WishlistItem } from '@/types'
import type { Repository } from './Repository'

export interface WishlistRepository extends Repository<WishlistItem> {
  findByRestaurant(restaurantId: string): Promise<WishlistItem | null>
}
