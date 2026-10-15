import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useData } from '@/data/DataProvider'
import type { FamilyMember, Household, NewRecord, PlaceResult, Visit } from '@/types'

/** Central list of query keys so invalidation stays consistent. */
export const keys = {
  session: ['session'] as const,
  household: ['household'] as const,
  members: ['members'] as const,
  restaurants: ['restaurants'] as const,
  visits: ['visits'] as const,
  places: (query: string) => ['places', query] as const,
}

export function useSession() {
  const { auth } = useData()
  return useQuery({ queryKey: keys.session, queryFn: () => auth.getSession() })
}

export function useSignInAs() {
  const { auth } = useData()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (memberId: string) => auth.signInAs(memberId),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.session }),
  })
}

export function useHousehold() {
  const { family } = useData()
  return useQuery({ queryKey: keys.household, queryFn: () => family.getHousehold() })
}

export function useUpdateHousehold() {
  const { family } = useData()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: Partial<NewRecord<Household>>) => family.updateHousehold(patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.household }),
  })
}

export function useMembers() {
  const { family } = useData()
  return useQuery({ queryKey: keys.members, queryFn: () => family.listMembers() })
}

export function useSaveMember() {
  const { family } = useData()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, values }: { id?: string; values: NewRecord<FamilyMember> }) =>
      id ? family.updateMember(id, values) : family.createMember(values),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.members }),
  })
}

export function useRemoveMember() {
  const { family } = useData()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => family.removeMember(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.members }),
  })
}

export function useRestaurants() {
  const { restaurants } = useData()
  return useQuery({ queryKey: keys.restaurants, queryFn: () => restaurants.list() })
}

export function useVisits() {
  const { visits } = useData()
  return useQuery({
    queryKey: keys.visits,
    queryFn: async () => {
      const all = await visits.list()
      // Newest first; ties broken by when the entry was created.
      return all.sort(
        (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
      )
    },
  })
}

export function useVisit(id: string | undefined) {
  const { visits } = useData()
  return useQuery({
    queryKey: [...keys.visits, id],
    queryFn: () => (id ? visits.get(id) : Promise.resolve(null)),
    enabled: !!id,
  })
}

export function usePlaceSearch(query: string) {
  const { places } = useData()
  return useQuery({
    queryKey: keys.places(query),
    queryFn: () => places.search(query, { limit: query.trim() ? 8 : 4 }),
    placeholderData: (previous) => previous,
  })
}

export function usePlace(placeId: string | null) {
  const { places } = useData()
  return useQuery({
    queryKey: ['place', placeId],
    queryFn: () => (placeId ? places.getById(placeId) : Promise.resolve(null)),
    enabled: !!placeId,
  })
}

export interface QuickLogInput {
  /** Existing draft being edited, if any. */
  visitId?: string
  place: PlaceResult
  date: string
  loggedBy: string
  familyRating?: number
  note: string
  photo?: File | string
  /** false keeps it a draft; true marks the visit complete. */
  complete: boolean
}

/** Saves the quick-log form: resolve the restaurant, store the photo, create/update the visit. */
export function useSaveQuickLog() {
  const { restaurants, visits, photos } = useData()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: QuickLogInput): Promise<Visit> => {
      const restaurant = await restaurants.upsertFromPlace(input.place)

      let photoUrl: string | undefined
      if (typeof input.photo === 'string') photoUrl = input.photo
      else if (input.photo) photoUrl = await photos.save(input.photo)

      const fields = {
        restaurantId: restaurant.id,
        date: input.date,
        familyRating: input.familyRating,
        notes: input.note.trim(),
        photos: photoUrl ? [photoUrl] : [],
        isDraft: !input.complete,
      }

      if (input.visitId) return visits.update(input.visitId, fields)
      return visits.create({
        ...fields,
        loggedBy: input.loggedBy,
        occasions: [],
        ratings: {},
      })
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.visits })
      void qc.invalidateQueries({ queryKey: keys.restaurants })
    },
  })
}
