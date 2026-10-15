import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useData } from '@/data/DataProvider'
import type { AllergyNote, DishEntry, KidInfo, NewRecord, Visit, WineEntry } from '@/types'
import { keys } from './queries'

export const journalKeys = {
  dishes: ['dishes'] as const,
  wines: ['wines'] as const,
  kidInfo: ['kidInfo'] as const,
  allergies: ['allergies'] as const,
}

export function useDishes() {
  const { dishes } = useData()
  return useQuery({ queryKey: journalKeys.dishes, queryFn: () => dishes.list() })
}
export function useWines() {
  const { wines } = useData()
  return useQuery({ queryKey: journalKeys.wines, queryFn: () => wines.list() })
}
export function useKidInfo() {
  const { kidInfo } = useData()
  return useQuery({ queryKey: journalKeys.kidInfo, queryFn: () => kidInfo.list() })
}
export function useAllergyNotes() {
  const { allergies } = useData()
  return useQuery({ queryKey: journalKeys.allergies, queryFn: () => allergies.list() })
}

/** Builds a save/delete mutation pair that refreshes one list. */
function useInvalidate(queryKey: readonly unknown[]) {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey })
}

export function useUpdateVisit() {
  const { visits } = useData()
  const invalidate = useInvalidate(keys.visits)
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<NewRecord<Visit>> }) =>
      visits.update(id, patch),
    onSuccess: invalidate,
  })
}

export function useSaveDish() {
  const { dishes } = useData()
  const invalidate = useInvalidate(journalKeys.dishes)
  return useMutation({
    mutationFn: ({ id, values }: { id?: string; values: NewRecord<DishEntry> }) =>
      id ? dishes.update(id, values) : dishes.create(values),
    onSuccess: invalidate,
  })
}
export function useDeleteDish() {
  const { dishes } = useData()
  const invalidate = useInvalidate(journalKeys.dishes)
  return useMutation({ mutationFn: (id: string) => dishes.remove(id), onSuccess: invalidate })
}

export function useSaveWine() {
  const { wines } = useData()
  const invalidate = useInvalidate(journalKeys.wines)
  return useMutation({
    mutationFn: ({ id, values }: { id?: string; values: NewRecord<WineEntry> }) =>
      id ? wines.update(id, values) : wines.create(values),
    onSuccess: invalidate,
  })
}
export function useDeleteWine() {
  const { wines } = useData()
  const invalidate = useInvalidate(journalKeys.wines)
  return useMutation({ mutationFn: (id: string) => wines.remove(id), onSuccess: invalidate })
}

export function useSaveKidInfo() {
  const { kidInfo } = useData()
  const invalidate = useInvalidate(journalKeys.kidInfo)
  return useMutation({
    mutationFn: ({ id, values }: { id?: string; values: NewRecord<KidInfo> }) =>
      id ? kidInfo.update(id, values) : kidInfo.create(values),
    onSuccess: invalidate,
  })
}

export function useSaveAllergyNote() {
  const { allergies } = useData()
  const invalidate = useInvalidate(journalKeys.allergies)
  return useMutation({
    mutationFn: ({ id, values }: { id?: string; values: NewRecord<AllergyNote> }) =>
      id ? allergies.update(id, values) : allergies.create(values),
    onSuccess: invalidate,
  })
}
export function useDeleteAllergyNote() {
  const { allergies } = useData()
  const invalidate = useInvalidate(journalKeys.allergies)
  return useMutation({ mutationFn: (id: string) => allergies.remove(id), onSuccess: invalidate })
}
