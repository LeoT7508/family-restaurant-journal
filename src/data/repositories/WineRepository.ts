import type { WineEntry } from '@/types'
import type { Repository } from './Repository'

export interface WineRepository extends Repository<WineEntry> {
  listByVisit(visitId: string): Promise<WineEntry[]>
  removeByVisit(visitId: string): Promise<void>
}
