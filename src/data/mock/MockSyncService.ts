import type { SyncService } from '@/data/repositories'
import { STORAGE_PREFIX } from './LocalStorageStore'

/** Counts records that were saved on this device but never "synced". There is no server yet. */
export class MockSyncService implements SyncService {
  async getPendingCount(): Promise<number> {
    let count = 0
    try {
      for (const key of Object.keys(localStorage)) {
        if (!key.startsWith(STORAGE_PREFIX) || key === `${STORAGE_PREFIX}session`) continue
        const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? '[]')
        if (!Array.isArray(parsed)) continue
        count += parsed.filter(
          (r) =>
            typeof r === 'object' && r !== null && 'syncStatus' in r && r.syncStatus !== 'synced',
        ).length
      }
    } catch {
      /* storage unavailable: report nothing pending */
    }
    return count
  }
  async syncNow(): Promise<void> {
    /* nothing to push to until a back end exists */
  }
}
