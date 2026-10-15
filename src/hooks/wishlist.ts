import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useData } from '@/data/DataProvider'
import type { PlaceResult } from '@/types'
import { keys } from './queries'

export const wishlistKey = ['wishlist'] as const

export function useWishlist() {
  const { wishlist } = useData()
  return useQuery({
    queryKey: wishlistKey,
    queryFn: async () => {
      const items = await wishlist.list()
      return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    },
  })
}

/** Saves the place as a restaurant if needed, then adds it once (no duplicates). */
export function useAddToWishlist() {
  const { restaurants, wishlist } = useData()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      place,
      addedBy,
      note,
    }: {
      place: PlaceResult
      addedBy: string
      note: string
    }) => {
      const restaurant = await restaurants.upsertFromPlace(place)
      const existing = await wishlist.findByRestaurant(restaurant.id)
      if (existing) return { item: existing, restaurant, alreadyThere: true }
      const item = await wishlist.create({
        restaurantId: restaurant.id,
        addedBy,
        note: note.trim(),
      })
      return { item, restaurant, alreadyThere: false }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: wishlistKey })
      void qc.invalidateQueries({ queryKey: keys.restaurants })
    },
  })
}

export function useRemoveFromWishlist() {
  const { wishlist } = useData()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => wishlist.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: wishlistKey }),
  })
}
