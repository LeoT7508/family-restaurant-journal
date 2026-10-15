import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/features/PageHeader'
import { WineCard, WineForm } from '@/components/features/WineSection'
import {
  BottomSheet,
  Button,
  Chip,
  EmptyState,
  ErrorState,
  Icon,
  Input,
  ListSkeleton,
  Select,
  useToast,
} from '@/components/ui'
import { useDeleteWine, useDishes, useSaveWine, useWines } from '@/hooks/journal'
import { useMembers, useRestaurants, useVisits } from '@/hooks/queries'
import { formatDate } from '@/lib/format'
import {
  EMPTY_WINE,
  EMPTY_WINE_FILTERS,
  filterWines,
  wineAverage,
  wineToForm,
  type WineFilters,
} from '@/lib/wine'
import type { WineEntry } from '@/types'

export default function Wine() {
  const wines = useWines()
  const visits = useVisits()
  const restaurants = useRestaurants()
  const members = useMembers()
  const dishes = useDishes()
  const save = useSaveWine()
  const remove = useDeleteWine()
  const toast = useToast()

  const [filters, setFilters] = useState<WineFilters>(EMPTY_WINE_FILTERS)
  const [editing, setEditing] = useState<WineEntry | 'new' | null>(null)
  const [visitId, setVisitId] = useState('')

  const queries = [wines, visits, restaurants, members, dishes]
  const parents = (members.data ?? []).filter((m) => m.isParent)
  const restaurantById = new Map((restaurants.data ?? []).map((r) => [r.id, r]))
  const visitById = new Map((visits.data ?? []).map((v) => [v.id, v]))

  const shown = useMemo(
    () =>
      filterWines(wines.data ?? [], filters).sort((a, b) => {
        const da = visitById.get(a.visitId)?.date ?? ''
        const db = visitById.get(b.visitId)?.date ?? ''
        return db.localeCompare(da) || (wineAverage(b) ?? 0) - (wineAverage(a) ?? 0)
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wines.data, visits.data, filters],
  )

  const close = () => {
    setEditing(null)
    setVisitId('')
  }
  const chosenVisitId = editing && editing !== 'new' ? editing.visitId : visitId
  const hasActiveFilter =
    filters.q || filters.serving || filters.favoritesOnly || filters.minRating > 0

  return (
    <div>
      <PageHeader
        title="Wine"
        subtitle="What we drank, and what each of us thought."
        action={
          <Button onClick={() => setEditing('new')} disabled={(visits.data ?? []).length === 0}>
            <Icon name="plus" size={18} /> Add wine
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3">
        <Input
          label="Search wine"
          hideLabel
          type="search"
          placeholder="Search by name, producer, grape or region"
          value={filters.q}
          onChange={(e) => setFilters({ ...filters, q: e.target.value })}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Chip
            selected={filters.favoritesOnly}
            onClick={() => setFilters({ ...filters, favoritesOnly: !filters.favoritesOnly })}
          >
            Favorites
          </Chip>
          <Chip
            selected={filters.serving === 'glass'}
            onClick={() =>
              setFilters({ ...filters, serving: filters.serving === 'glass' ? '' : 'glass' })
            }
          >
            By the glass
          </Chip>
          <Chip
            selected={filters.serving === 'bottle'}
            onClick={() =>
              setFilters({ ...filters, serving: filters.serving === 'bottle' ? '' : 'bottle' })
            }
          >
            Bottles
          </Chip>
          <div className="w-44">
            <Select
              label="Minimum rating"
              hideLabel
              value={filters.minRating}
              onChange={(e) => setFilters({ ...filters, minRating: Number(e.target.value) })}
            >
              <option value={0}>Any rating</option>
              <option value={3}>3 stars and up</option>
              <option value={4}>4 stars and up</option>
              <option value={5}>5 stars</option>
            </Select>
          </div>
          {hasActiveFilter && (
            <Button variant="ghost" onClick={() => setFilters(EMPTY_WINE_FILTERS)}>
              Clear all
            </Button>
          )}
        </div>
        <p className="text-sm text-ink-muted">
          A favorite is any wine rated 4 stars or more by everyone who rated it.
        </p>
      </div>

      {queries.some((q) => q.isLoading) ? (
        <ListSkeleton rows={3} />
      ) : queries.some((q) => q.isError) ? (
        <ErrorState onRetry={() => queries.forEach((q) => void q.refetch())} />
      ) : (wines.data ?? []).length === 0 ? (
        <EmptyState
          icon="wine"
          title="No wine logged yet"
          description="Add a wine from a visit and you'll both be able to rate it."
        />
      ) : shown.length === 0 ? (
        <EmptyState
          icon="search"
          title="No wine matches those filters"
          description="Try removing a filter."
          action={
            <Button variant="secondary" onClick={() => setFilters(EMPTY_WINE_FILTERS)}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <>
          <p className="mb-3 text-sm font-medium text-ink-muted" aria-live="polite">
            {shown.length} {shown.length === 1 ? 'wine' : 'wines'}
          </p>
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {shown.map((w) => {
              const visit = visitById.get(w.visitId)
              const restaurant = visit ? restaurantById.get(visit.restaurantId) : undefined
              return (
                <li key={w.id}>
                  <WineCard
                    wine={w}
                    parents={parents}
                    where={
                      visit && restaurant ? { visit, restaurantName: restaurant.name } : undefined
                    }
                    onEdit={() => setEditing(w)}
                  />
                </li>
              )
            })}
          </ul>
        </>
      )}

      <BottomSheet
        open={editing !== null}
        onClose={close}
        title={editing === 'new' ? 'Add wine' : 'Edit wine'}
      >
        {editing === 'new' && (
          <div className="mb-4">
            <Select
              label="Which visit?"
              value={visitId}
              onChange={(e) => setVisitId(e.target.value)}
              data-autofocus
            >
              <option value="">Choose a visit</option>
              {(visits.data ?? []).map((v) => (
                <option key={v.id} value={v.id}>
                  {restaurantById.get(v.restaurantId)?.name ?? 'Restaurant'} · {formatDate(v.date)}
                </option>
              ))}
            </Select>
          </div>
        )}
        {editing && chosenVisitId && (
          <WineForm
            key={editing === 'new' ? `new-${chosenVisitId}` : editing.id}
            parents={parents}
            dishes={(dishes.data ?? []).filter((d) => d.visitId === chosenVisitId)}
            defaultValues={editing === 'new' ? EMPTY_WINE : wineToForm(editing)}
            saving={save.isPending}
            deleting={remove.isPending}
            onCancel={close}
            onSubmit={(values) => {
              const id = editing !== 'new' ? editing.id : undefined
              save.mutate(
                { id, values: { ...values, visitId: chosenVisitId } },
                {
                  onSuccess: () => {
                    toast.show(id ? 'Wine updated.' : 'Wine added.')
                    close()
                  },
                  onError: (e) => toast.show(e.message, 'error'),
                },
              )
            }}
            onDelete={
              editing !== 'new'
                ? () =>
                    remove.mutate(editing.id, {
                      onSuccess: () => {
                        toast.show('Wine deleted.')
                        close()
                      },
                      onError: (e) => toast.show(e.message, 'error'),
                    })
                : undefined
            }
          />
        )}
      </BottomSheet>
    </div>
  )
}
