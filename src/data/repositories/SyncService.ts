/**
 * Hook for offline-first sync. Records are saved locally first (syncStatus 'local'),
 * then pushed to the server later. The mock does nothing.
 */
export interface SyncService {
  getPendingCount(): Promise<number>
  syncNow(): Promise<void>
}
