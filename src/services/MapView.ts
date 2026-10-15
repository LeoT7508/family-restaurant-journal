import type { ComponentType } from 'react'

export interface MapMarker {
  id: string
  name: string
  driveMinutes: number
  /** visited = in the journal, wishlist = still to try, both = visited and on the wishlist */
  kind: 'visited' | 'wishlist' | 'both'
}

export interface MapViewProps {
  markers: MapMarker[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  homeLabel: string
  radiusMinutes: number
}

/**
 * The map the app shows. The placeholder draws drive-time rings; a real map (Google Maps,
 * Mapbox, ...) can replace it later by implementing this and changing one line in
 * `components/features/MapView.tsx`.
 */
export type MapViewComponent = ComponentType<MapViewProps>
