import { useMemo, useState } from 'react'
import { Link, Navigate, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/features/PageHeader'
import { VisitCard } from '@/components/features/VisitCard'
import { VisitDetailView } from '@/components/features/VisitDetailView'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import {
  BottomSheet,
  Button,
  buttonStyles,
  Chip,
  EmptyState,
  ErrorState,
  Icon,
  Input,
  ListSkeleton,
  Select,
} from '@/components/ui'
import { useDishes, useKidInfo, useWines } from '@/hooks/journal'
import { useMembers, useRestaurants, useVisits } from '@/hooks/queries'
import { SAFE_FILTER_HINT, SAFE_FILTER_LABEL } from '@/lib/allergy'
import {
  activeFilterCount,
  DRIVE_OPTIONS,
  EMPTY_FILTERS,
  filterVisits,
  filtersToParams,
  parseFilters,
  type JournalFilters,
} from '@/lib/journal'
import { tripDestination } from '@/lib/trip'
import { OCCASIONS } from '@/types'

export default function Journal() {
  const [params, setParams] = useSearchParams()
  const { visitId } = useParams()
  const { search } = useLocation()
  // On a laptop the journal is a list with the chosen visit beside it; on smaller screens a visit is its own page.
  const wide = useMediaQuery('(min-width: 1024px)')
  const [sheetOpen, setSheetOpen] = useState(false)
  const filters = parseFilters(params)

  const visits = useVisits()
  const restaurants = useRestaurants()
  const members = useMembers()
  const dishes = useDishes()
  const wines = useWines()
  const kidInfo = useKidInfo()
  const queries = [visits, restaurants, members, dishes, wines, kidInfo]

  const change = (patch: Partial<JournalFilters>) =>
    setParams(filtersToParams({ ...filters, ...patch }), { replace: true })

  const ctx = useMemo(
    () => ({
      restaurants: restaurants.data ?? [],
      visits: visits.data ?? [],
      dishes: dishes.data ?? [],
      wines: wines.data ?? [],
      kidInfo: kidInfo.data ?? [],
    }),
    [restaurants.data, visits.data, dishes.data, wines.data, kidInfo.data],
  )
  const results = useMemo(() => filterVisits(ctx.visits, ctx, filters), [ctx, filters])

  const cuisines = [...new Set(ctx.restaurants.map((r) => r.cuisine))].sort()
  const usedOccasions = ctx.visits.flatMap((v) => v.occasions)
  const occasions = [...new Set<string>([...OCCASIONS, ...usedOccasions])]
  const byId = new Map(ctx.restaurants.map((r) => [r.id, r]))
  const activeCount = activeFilterCount(filters)
  // The chips show their own state, so the button counts only what's inside the sheet.
  const sheetCount = [filters.cuisine, filters.maxDrive, filters.occasion, filters.where].filter(
    Boolean,
  ).length
  const trips = [...new Set(ctx.restaurants.flatMap((r) => tripDestination(r.tags) ?? []))].sort()
  const hasAnyVisits = ctx.visits.length > 0

  if (!wide && visitId) return <Navigate to={`/visits/${visitId}${search}`} replace />

  return (
    <div>
      <PageHeader title="Journal" subtitle="Every place we've eaten, newest first." />

      <div className="mb-4 flex flex-col gap-3">
        <Input
          label="Search the journal"
          hideLabel
          type="search"
          placeholder="Search restaurants, dishes, wine, notes"
          value={filters.q}
          onChange={(e) => change({ q: e.target.value })}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Chip
            selected={filters.kidFriendly}
            onClick={() => change({ kidFriendly: !filters.kidFriendly })}
          >
            Kid-friendly
          </Chip>
          <Chip
            selected={filters.safeForAllergy}
            onClick={() => change({ safeForAllergy: !filters.safeForAllergy })}
          >
            {SAFE_FILTER_LABEL}
          </Chip>
          <Chip
            selected={filters.goAgain === 'yes'}
            onClick={() => change({ goAgain: filters.goAgain === 'yes' ? '' : 'yes' })}
          >
            Go again
          </Chip>
          <Button variant="secondary" onClick={() => setSheetOpen(true)}>
            <Icon name="search" size={18} /> More filters{sheetCount ? ` (${sheetCount})` : ''}
          </Button>
          {activeCount > 0 && (
            <Button variant="ghost" onClick={() => setParams({}, { replace: true })}>
              Clear all
            </Button>
          )}
        </div>
        {filters.safeForAllergy && (
          <p className="text-sm text-ink-muted">
            {SAFE_FILTER_LABEL}: {SAFE_FILTER_HINT}
          </p>
        )}
      </div>

      {queries.some((q) => q.isLoading) ? (
        <ListSkeleton rows={4} />
      ) : queries.some((q) => q.isError) ? (
        <ErrorState onRetry={() => queries.forEach((q) => void q.refetch())} />
      ) : !hasAnyVisits ? (
        <EmptyState
          icon="book"
          title="Nothing here yet"
          description="Log the last few meals you loved and they'll show up here."
          action={
            <Link to="/log" className={buttonStyles('primary')}>
              Log a visit
            </Link>
          }
        />
      ) : results.length === 0 ? (
        <EmptyState
          icon="search"
          title="No visits match those filters"
          description="Try removing a filter or searching for something else."
          action={
            <Button variant="secondary" onClick={() => setParams({}, { replace: true })}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <div
          className={
            wide ? 'grid grid-cols-[minmax(0,24rem)_minmax(0,1fr)] items-start gap-6' : undefined
          }
        >
          <div>
            <p className="mb-3 text-sm font-medium text-ink-muted" aria-live="polite">
              {results.length} {results.length === 1 ? 'visit' : 'visits'}
            </p>
            <ul className={wide ? 'flex flex-col gap-3' : 'grid grid-cols-1 gap-3 md:grid-cols-2'}>
              {results.map((v) => (
                <li key={v.id}>
                  <VisitCard
                    visit={v}
                    restaurant={byId.get(v.restaurantId)}
                    members={members.data ?? []}
                    to={wide && !v.isDraft ? `/journal/${v.id}${search}` : undefined}
                    selected={wide && v.id === visitId}
                  />
                </li>
              ))}
            </ul>
          </div>
          {wide && (
            <aside
              aria-label="Selected visit"
              className="sticky top-6 max-h-[calc(100dvh-3rem)] overflow-y-auto rounded-lg border border-line p-5"
            >
              {visitId ? (
                <VisitDetailView key={visitId} visitId={visitId} embedded />
              ) : (
                <EmptyState
                  icon="book"
                  title="Choose a visit"
                  description="Pick one from the list to see its dishes, wine, kid notes and ratings here."
                />
              )}
            </aside>
          )}
        </div>
      )}

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Filters">
        <div className="flex flex-col gap-4">
          <Select
            label="Cuisine"
            value={filters.cuisine}
            onChange={(e) => change({ cuisine: e.target.value })}
          >
            <option value="">Any cuisine</option>
            {cuisines.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Select
            label="Drive time"
            value={filters.maxDrive ?? ''}
            onChange={(e) => change({ maxDrive: e.target.value ? Number(e.target.value) : null })}
          >
            <option value="">Any distance</option>
            {DRIVE_OPTIONS.map((m) => (
              <option key={m} value={m}>
                Within {m} minutes
              </option>
            ))}
          </Select>
          {trips.length > 0 && (
            <Select
              label="Where"
              value={filters.where}
              onChange={(e) => change({ where: e.target.value })}
            >
              <option value="">Anywhere</option>
              <option value="home">Near home</option>
              {trips.map((t) => (
                <option key={t} value={t}>
                  Trip: {t}
                </option>
              ))}
            </Select>
          )}
          <Select
            label="Occasion"
            value={filters.occasion}
            onChange={(e) => change({ occasion: e.target.value })}
          >
            <option value="">Any occasion</option>
            {occasions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </Select>
          <Select
            label="Go again?"
            value={filters.goAgain}
            onChange={(e) => change({ goAgain: e.target.value as JournalFilters['goAgain'] })}
          >
            <option value="">Any answer</option>
            <option value="yes">Yes</option>
            <option value="maybe">Maybe</option>
            <option value="never">Never</option>
          </Select>
          <div className="flex gap-2 pt-2">
            <Button onClick={() => setSheetOpen(false)} fullWidth>
              Show {results.length} {results.length === 1 ? 'visit' : 'visits'}
            </Button>
            <Button variant="ghost" onClick={() => change({ ...EMPTY_FILTERS })} fullWidth>
              Reset
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  )
}
