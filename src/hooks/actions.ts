import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useData } from '@/data/DataProvider'
import type { JournalSnapshot } from '@/lib/export'
import {
  deleteRestaurant,
  deleteVisit,
  mergeRestaurants,
  restaurantFootprint,
} from '@/lib/restaurantActions'
import type { NewRecord, Restaurant } from '@/types'

/** After a multi-record change, refresh everything: simpler and safer than picking keys. */
function useRefreshAll() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries()
}

export function useUpdateRestaurant() {
  const { restaurants } = useData()
  const refresh = useRefreshAll()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<NewRecord<Restaurant>> }) =>
      restaurants.update(id, patch),
    onSuccess: refresh,
  })
}

export function useDeleteVisit() {
  const data = useData()
  const refresh = useRefreshAll()
  return useMutation({ mutationFn: (id: string) => deleteVisit(data, id), onSuccess: refresh })
}

export function useDeleteRestaurant() {
  const data = useData()
  const refresh = useRefreshAll()
  return useMutation({ mutationFn: (id: string) => deleteRestaurant(data, id), onSuccess: refresh })
}

export function useMergeRestaurants() {
  const data = useData()
  const refresh = useRefreshAll()
  return useMutation({
    mutationFn: ({ sourceId, targetId }: { sourceId: string; targetId: string }) =>
      mergeRestaurants(data, sourceId, targetId),
    onSuccess: refresh,
  })
}

export function useRestaurantFootprint(restaurantId: string | undefined, enabled: boolean) {
  const data = useData()
  return useQuery({
    queryKey: ['footprint', restaurantId],
    queryFn: () => restaurantFootprint(data, restaurantId!),
    enabled: enabled && !!restaurantId,
    staleTime: 0,
  })
}

export function useUpdateWishlistNote() {
  const { wishlist } = useData()
  const refresh = useRefreshAll()
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      wishlist.update(id, { note: note.trim() }),
    onSuccess: refresh,
  })
}

/** Reads every collection, for export. Only runs when asked. */
export function useLoadSnapshot() {
  const data = useData()
  return async (): Promise<JournalSnapshot> => {
    const [
      household,
      members,
      restaurants,
      visits,
      dishes,
      wines,
      kidInfo,
      allergyNotes,
      wishlist,
    ] = await Promise.all([
      data.family.getHousehold(),
      data.family.listMembers(),
      data.restaurants.list(),
      data.visits.list(),
      data.dishes.list(),
      data.wines.list(),
      data.kidInfo.list(),
      data.allergies.list(),
      data.wishlist.list(),
    ])
    return {
      household,
      members,
      restaurants,
      visits,
      dishes,
      wines,
      kidInfo,
      allergyNotes,
      wishlist,
    }
  }
}

export function usePendingSync() {
  const { sync } = useData()
  return useQuery({
    queryKey: ['sync', 'pending'],
    queryFn: () => sync.getPendingCount(),
    staleTime: 0,
  })
}
