import { useQuery } from '@tanstack/react-query'
import { useData } from '@/data/DataProvider'
import type { RecommendContext } from '@/lib/recommend'
import { useDishes, useKidInfo, useWines } from './journal'
import { useHousehold, useMembers, useRestaurants, useVisits } from './queries'
import { useWishlist } from './wishlist'

/** Everything the recommender needs, loaded through the usual hooks. */
export function useRecommendContext(): {
  ctx: RecommendContext | null
  isLoading: boolean
  isError: boolean
  refetch: () => void
} {
  const { places } = useData()
  const restaurants = useRestaurants()
  const visits = useVisits()
  const dishes = useDishes()
  const wines = useWines()
  const kidInfo = useKidInfo()
  const wishlist = useWishlist()
  const members = useMembers()
  const household = useHousehold()
  const allPlaces = useQuery({
    queryKey: ['places', 'all'],
    queryFn: () => places.search('', { limit: 500 }),
  })

  const all = [restaurants, visits, dishes, wines, kidInfo, wishlist, members, household, allPlaces]
  const ready = all.every((q) => q.data !== undefined)
  return {
    ctx: ready
      ? {
          restaurants: restaurants.data!,
          visits: visits.data!,
          dishes: dishes.data!,
          wines: wines.data!,
          kidInfo: kidInfo.data!,
          wishlist: wishlist.data!,
          members: members.data!,
          places: allPlaces.data!,
          travelDestination: household.data?.travel?.destination,
        }
      : null,
    isLoading: all.some((q) => q.isLoading),
    isError: all.some((q) => q.isError),
    refetch: () => all.forEach((q) => void q.refetch()),
  }
}
