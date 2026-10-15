import { Link, useParams } from 'react-router-dom'
import { AllergyNotes } from '@/components/features/AllergySection'
import { RestaurantActions } from '@/components/features/RestaurantActions'
import { PageHeader } from '@/components/features/PageHeader'
import { Section } from '@/components/features/Section'
import { VisitCard } from '@/components/features/VisitCard'
import { WineCard } from '@/components/features/WineSection'
import { Badge, Card, ErrorState, ListSkeleton } from '@/components/ui'
import { useDishes, useKidInfo, useWines } from '@/hooks/journal'
import { useMembers, useRestaurants, useVisits } from '@/hooks/queries'
import { restaurantIdsWithSafeNotes } from '@/lib/allergy'
import { describeDistance, formatDate, formatPrice } from '@/lib/format'

const KID_FLAGS = [
  ['kidsMenu', "Kids' menu"],
  ['highChair', 'High chair'],
  ['roomForStroller', 'Room for a stroller'],
  ['quickService', 'Quick service'],
] as const

export default function RestaurantDetail() {
  const { restaurantId } = useParams()
  const restaurants = useRestaurants()
  const visits = useVisits()
  const dishes = useDishes()
  const wines = useWines()
  const kidInfo = useKidInfo()
  const members = useMembers()

  const queries = [restaurants, visits, dishes, wines, kidInfo, members]
  if (queries.some((q) => q.isLoading)) return <ListSkeleton rows={3} />
  if (queries.some((q) => q.isError)) {
    return <ErrorState onRetry={() => queries.forEach((q) => void q.refetch())} />
  }

  const restaurant = restaurants.data?.find((r) => r.id === restaurantId)
  if (!restaurant) {
    return (
      <ErrorState title="We couldn't find that restaurant" message="It may have been removed." />
    )
  }

  const allMembers = members.data ?? []
  const parents = allMembers.filter((m) => m.isParent)
  const myVisits = (visits.data ?? []).filter((v) => v.restaurantId === restaurant.id)
  const visitIds = new Set(myVisits.map((v) => v.id))
  const myDishes = (dishes.data ?? []).filter((d) => visitIds.has(d.visitId))
  const myWines = (wines.data ?? []).filter((w) => visitIds.has(w.visitId))
  const myKidInfo = (kidInfo.data ?? []).filter((k) => k.restaurantId === restaurant.id)
  const nameOf = (id: string) => allMembers.find((m) => m.id === id)?.name ?? 'Someone'

  const loved = myDishes.filter((d) => Object.values(d.verdicts).includes('loved'))
  const allergic = allMembers.find((m) => m.allergies.length > 0)
  const fineDishes = myDishes.filter((d) => d.safeForAllergy === 'safe')
  const hasSafeNotes = restaurantIdsWithSafeNotes(myDishes, myVisits).has(restaurant.id)
  const flags = KID_FLAGS.filter(([key]) => myKidInfo.some((k) => k[key]))
  const favorites = myKidInfo.flatMap((k) => Object.entries(k.favoriteDishByChild))
  const visitById = new Map(myVisits.map((v) => [v.id, v]))

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={restaurant.name} subtitle={restaurant.address} />
      <div className="mb-6 flex flex-wrap gap-2">
        <Badge>{restaurant.cuisine}</Badge>
        <Badge>{formatPrice(restaurant.priceLevel)}</Badge>
        <Badge icon="pin">{describeDistance(restaurant)}</Badge>
        {restaurant.status === 'closed' && (
          <Badge tone="highlight" icon="alert">
            Closed
          </Badge>
        )}
        {allergic && hasSafeNotes && (
          <Badge tone="calm" icon="info">
            Your notes: {allergic.name} ate {fineDishes.map((d) => d.name).join(', ')} fine
          </Badge>
        )}
      </div>

      <RestaurantActions
        restaurant={restaurant}
        others={(restaurants.data ?? []).filter((r) => r.id !== restaurant.id)}
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-8">
          <Section title={`Visits (${myVisits.length})`}>
            {myVisits.length === 0 ? (
              <p className="rounded-md bg-surface-2 p-4 text-ink-muted">No visits logged yet.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {myVisits.map((v) => (
                  <li key={v.id}>
                    <VisitCard visit={v} restaurant={restaurant} members={allMembers} />
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Dishes loved">
            {loved.length === 0 ? (
              <p className="rounded-md bg-surface-2 p-4 text-ink-muted">
                No standout dishes yet. Add dishes on a visit.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {loved.map((d) => (
                  <li key={d.id}>
                    <Card className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold">{d.name}</span>
                      <span className="text-sm text-ink-muted">
                        Loved by{' '}
                        {Object.entries(d.verdicts)
                          .filter(([, verdict]) => verdict === 'loved')
                          .map(([id]) => nameOf(id))
                          .join(', ')}
                        {visitById.get(d.visitId) &&
                          ` · ${formatDate(visitById.get(d.visitId)!.date)}`}
                      </span>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <div className="flex flex-col gap-8">
          <Section title="Kids">
            {flags.length === 0 && favorites.length === 0 ? (
              <p className="rounded-md bg-surface-2 p-4 text-ink-muted">No kid notes yet.</p>
            ) : (
              <Card className="flex flex-col gap-3">
                <ul className="flex flex-wrap gap-1.5" aria-label="Kid-friendly features">
                  {flags.map(([key, label]) => (
                    <li key={key}>
                      <Badge tone="sage" icon="check">
                        {label}
                      </Badge>
                    </li>
                  ))}
                </ul>
                {favorites.length > 0 && (
                  <ul className="flex flex-col gap-1">
                    {favorites.map(([id, dish]) => (
                      <li key={`${id}-${dish}`}>
                        <span className="font-medium">{nameOf(id)}&apos;s favorite:</span> {dish}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            )}
          </Section>

          <AllergyNotes restaurantId={restaurant.id} members={allMembers} readOnly />

          <Section title="Wine notes">
            {myWines.length === 0 ? (
              <p className="rounded-md bg-surface-2 p-4 text-ink-muted">No wine logged here.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {myWines.map((w) => (
                  <li key={w.id}>
                    <WineCard wine={w} parents={parents} />
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>
      <p className="mt-8 text-sm text-ink-muted">
        To add or change notes, open a visit from{' '}
        <Link to="/journal" className="font-medium text-accent underline-offset-4 hover:underline">
          the journal
        </Link>
        .
      </p>
    </div>
  )
}
