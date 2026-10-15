/**
 * THE SWAP POINT.
 *
 * This is the only file that decides which data implementation the app uses (besides tests).
 * The Supabase layer is used whenever the two VITE_SUPABASE_* values are set. To add another back end
 * (or Google Places), build a `DataLayer` from implementations of the interfaces in
 * `src/data/repositories` and `src/services/PlacesService` and return it here.
 * No component or hook needs to change.
 */
import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { DataLayer } from './repositories'
import { createMockDataLayer } from './mock/createMockDataLayer'
import { isSupabaseConfigured, isSupabaseKeyMissing, supabaseHost } from './supabase/client'
import { createSupabaseDataLayer } from './supabase/createSupabaseDataLayer'

// With VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY set (in .env.local) the app uses Supabase;
// without them it falls back to the sample data stored in this browser.
const createDataLayer = isSupabaseConfigured ? createSupabaseDataLayer : createMockDataLayer

const DataContext = createContext<DataLayer | null>(null)

export function DataProvider({ children, value }: { children: ReactNode; value?: DataLayer }) {
  const layer = useMemo(() => value ?? createDataLayer(), [value])
  return <DataContext.Provider value={layer}>{children}</DataContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useData(): DataLayer {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used inside <DataProvider>')
  return ctx
}

/** Which back end is in use, and whether setup looks half-finished (URL set, key missing). */
// eslint-disable-next-line react-refresh/only-export-components
export function useBackendInfo(): {
  backend: DataLayer['backend']
  keyMissing: boolean
  host: string
} {
  const layer = useData()
  return {
    backend: layer.backend,
    keyMissing: layer.backend === 'mock' && isSupabaseKeyMissing,
    host: supabaseHost,
  }
}
