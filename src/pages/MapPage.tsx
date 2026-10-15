import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/features/PageHeader'
import { MapView } from '@/components/features/MapView'
import {
  Badge,
  buttonStyles,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  ListSkeleton,
} from '@/components/ui'
import { useRestaurants, useHousehold, useVisits } from '@/hooks/queries'
import { useWishlist } from '@/hooks/wishlist'
import { cn } from '@/lib/cn'
import { isTripPlace } from '@/lib/trip'
import { formatDrive, formatPrice } from '@/lib/format'
import type { MapMarker } from '@/services/MapView'

type Show = 'all' | 'visited' | 'wishlist'

export default function MapPage() {
  const restaurants = useRestaurants()
  const visits = useVisits()
  const wishlist = useWishlist()
  const household = useHousehold()
  const [show, setShow] = useState<Show>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const queries = [restaurants, visits, wishlist, household]

  const all = useMemo<(MapMarker & { cuisine: string; priceLevel: number })[]>(() => {
    const visited = new Set((visits.data ?? []).map((v) => v.restaurantId))
    const wished = new Set((wishlist.data ?? []).map((w) => w.restaurantId))
    return (restaurants.data ?? []).flatMap((r) => {
      // Drive-time rings only make sense for places near home.
      if (isTripPlace(r.tags)) return []
      const isVisited = visited.has(r.id)
      const isWished = wished.has(r.id)
      if (!isVisited && !isWished) return []
      return [
        {
          id: r.id,
          name: r.name,
          driveMinutes: r.driveMinutes,
          cuisine: r.cuisine,
          priceLevel: r.priceLevel,
          kind:
            isVisited && isWished
              ? ('both' as const)
              : isVisited
                ? ('visited' as const)
                : ('wishlist' as const),
        },
      ]
    })
  }, [restaurants.data, visits.data, wishlist.data])

  const tripCount = (restaurants.data ?? []).filter((r) => isTripPlace(r.tags)).length
  const shown = all.filter((m) => show === 'all' || m.kind === 'both' || m.kind === show)
  const selected = shown.find((m) => m.id === selectedId) ?? null
  const kindLabel = {
    visited: 'Visited',
    wishlist: 'Wishlist',
    both: 'Visited and on the wishlist',
  } as const

  return (
    <div>
      <PageHeader title="Map" subtitle="Where we've eaten and where we want to go." />

      {queries.some((q) => q.isLoading) ? (
        <ListSkeleton rows={3} />
      ) : queries.some((q) => q.isError) ? (
        <ErrorState onRetry={() => queries.forEach((q) => void q.refetch())} />
      ) : all.length === 0 ? (
        <EmptyState
          icon="map"
          title="No places to show yet"
          description="Log a visit or add a wishlist place and it will appear here."
          action={
            <Link to="/log" className={buttonStyles('primary')}>
              Log a visit
            </Link>
          }
        />
      ) : (
        <>
          {tripCount > 0 && (
            <p className="mb-3 text-sm text-ink-muted">
              {tripCount} trip {tripCount === 1 ? 'place isn' : 'places aren'}&apos;t shown here
              because they&apos;re not near home.
            </p>
          )}
          <div className="mb-4 flex flex-wrap gap-2">
            {(['all', 'visited', 'wishlist'] as const).map((s) => (
              <Chip key={s} selected={show === s} onClick={() => setShow(s)}>
                {s === 'all' ? 'All places' : s === 'visited' ? 'Visited' : 'Wishlist'}
              </Chip>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <MapView
              markers={shown}
              selectedId={selectedId}
              onSelect={setSelectedId}
              homeLabel={household.data?.homeLabel ?? 'home'}
              radiusMinutes={household.data?.driveRadiusMinutes ?? 20}
            />

            <section aria-labelledby="places" className="flex flex-col gap-3">
              <h2 id="places" className="text-xl">
                {shown.length} {shown.length === 1 ? 'place' : 'places'}
              </h2>
              {selected && (
                <Card className="border-2 border-accent">
                  <p className="text-sm font-medium text-accent">{kindLabel[selected.kind]}</p>
                  <h3 className="text-lg">{selected.name}</h3>
                  <p className="text-sm text-ink-muted">
                    {selected.cuisine} · {formatPrice(selected.priceLevel)} ·{' '}
                    {formatDrive(selected.driveMinutes)}
                  </p>
                  <Link
                    to={`/restaurants/${selected.id}`}
                    className="mt-2 inline-block text-sm font-medium text-accent underline-offset-4 hover:underline"
                  >
                    Open details
                  </Link>
                </Card>
              )}
              <ul className="flex flex-col gap-2">
                {[...shown]
                  .sort((a, b) => a.driveMinutes - b.driveMinutes)
                  .map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        aria-pressed={m.id === selectedId}
                        onClick={() => setSelectedId(m.id === selectedId ? null : m.id)}
                        className={cn(
                          'flex min-h-touch w-full items-center justify-between gap-3 rounded-md border-2 bg-surface px-3 py-2 text-left',
                          m.id === selectedId ? 'border-accent' : 'border-line hover:bg-surface-2',
                        )}
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{m.name}</span>
                          <span className="block text-sm text-ink-muted">{m.cuisine}</span>
                        </span>
                        <span className="flex shrink-0 flex-col items-end gap-1">
                          <Badge tone={m.kind === 'wishlist' ? 'highlight' : 'accent'}>
                            {kindLabel[m.kind]}
                          </Badge>
                          <span className="text-xs text-ink-muted">
                            {formatDrive(m.driveMinutes)}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
              </ul>
            </section>
          </div>
        </>
      )}
    </div>
  )
}
