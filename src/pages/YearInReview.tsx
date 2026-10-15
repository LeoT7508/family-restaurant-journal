import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/features/PageHeader'
import { Section } from '@/components/features/Section'
import { buttonStyles, Card, EmptyState, ErrorState, ListSkeleton, Select } from '@/components/ui'
import { useDishes, useWines } from '@/hooks/journal'
import { useRestaurants, useVisits } from '@/hooks/queries'
import { formatMoney } from '@/lib/format'
import { buildYearInReview, yearsWithVisits } from '@/lib/yearInReview'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="flex flex-col gap-0.5">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="text-2xl font-semibold">{value}</dd>
    </Card>
  )
}

function List({
  items,
  label,
}: {
  items: { key: string; main: string; sub?: string; right: string }[]
  label: string
}) {
  if (items.length === 0)
    return <p className="rounded-md bg-surface-2 p-4 text-ink-muted">Nothing yet.</p>
  return (
    <ol aria-label={label} className="flex flex-col gap-2">
      {items.map((item, i) => (
        <li key={item.key}>
          <Card className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-medium text-accent"
            >
              {i + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{item.main}</span>
              {item.sub && (
                <span className="block truncate text-sm text-ink-muted">{item.sub}</span>
              )}
            </span>
            <span className="shrink-0 text-sm font-medium">{item.right}</span>
          </Card>
        </li>
      ))}
    </ol>
  )
}

export default function YearInReviewPage() {
  const visits = useVisits()
  const restaurants = useRestaurants()
  const dishes = useDishes()
  const wines = useWines()
  const queries = [visits, restaurants, dishes, wines]
  const [chosen, setChosen] = useState<number | null>(null)

  const years = useMemo(() => yearsWithVisits(visits.data ?? []), [visits.data])
  const year = chosen ?? years[0]
  const review = useMemo(
    () =>
      year === undefined
        ? null
        : buildYearInReview(year, {
            visits: visits.data ?? [],
            restaurants: restaurants.data ?? [],
            dishes: dishes.data ?? [],
            wines: wines.data ?? [],
          }),
    [year, visits.data, restaurants.data, dishes.data, wines.data],
  )

  const maxMonth = Math.max(1, ...(review?.byMonth ?? [1]))

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Year in review"
        subtitle="What we ate, loved and spent."
        action={
          years.length > 1 ? (
            <div className="w-28">
              <Select
                label="Year"
                hideLabel
                value={year}
                onChange={(e) => setChosen(Number(e.target.value))}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Select>
            </div>
          ) : undefined
        }
      />

      {queries.some((q) => q.isLoading) ? (
        <ListSkeleton rows={4} />
      ) : queries.some((q) => q.isError) ? (
        <ErrorState onRetry={() => queries.forEach((q) => void q.refetch())} />
      ) : !review || review.visitCount === 0 ? (
        <EmptyState
          icon="chart"
          title="Nothing to review yet"
          description="Once you've logged and finished a few visits, your year shows up here."
          action={
            <Link to="/log" className={buttonStyles('primary')}>
              Log a visit
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-8">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="Visits" value={String(review.visitCount)} />
            <Stat label="Restaurants" value={String(review.restaurantCount)} />
            <Stat label="New to us" value={String(review.newRestaurants.length)} />
            <Stat label="Total spent" value={formatMoney(review.totalSpent)} />
            <Stat
              label="Per visit"
              value={review.averagePerVisit !== null ? formatMoney(review.averagePerVisit) : 'n/a'}
            />
            <Stat
              label="Per person"
              value={
                review.averagePerPerson !== null ? formatMoney(review.averagePerPerson) : 'n/a'
              }
            />
          </dl>

          <Section title="Visits by month">
            <ol aria-label="Visits by month" className="flex flex-col gap-1.5">
              {review.byMonth.map((count, i) => (
                <li key={MONTHS[i]} className="flex items-center gap-3 text-sm">
                  <span className="w-9 shrink-0 text-ink-muted">{MONTHS[i]}</span>
                  <span className="h-3 flex-1 rounded-full bg-surface-2">
                    <span
                      className="block h-3 rounded-full bg-brand"
                      style={{ width: `${(count / maxMonth) * 100}%` }}
                    />
                  </span>
                  <span className="w-6 shrink-0 text-right font-medium">{count}</span>
                </li>
              ))}
            </ol>
          </Section>

          <Section title="Top rated">
            <List
              label="Top rated restaurants"
              items={review.topRated.map((t) => ({
                key: t.restaurant.id,
                main: t.restaurant.name,
                sub: t.restaurant.cuisine,
                right: `${t.average.toFixed(1)} avg`,
              }))}
            />
          </Section>

          <Section title="Most visited">
            <List
              label="Most visited restaurants"
              items={review.mostVisited.map((m) => ({
                key: m.restaurant.id,
                main: m.restaurant.name,
                sub: m.restaurant.cuisine,
                right: `${m.count} ${m.count === 1 ? 'visit' : 'visits'}`,
              }))}
            />
          </Section>

          <Section title="Favorite cuisines">
            <List
              label="Favorite cuisines"
              items={review.topCuisines.map((c) => ({
                key: c.cuisine,
                main: c.cuisine,
                right: `${c.count} ${c.count === 1 ? 'visit' : 'visits'}`,
              }))}
            />
          </Section>

          <Section title="Dishes we loved">
            <List
              label="Dishes we loved"
              items={review.lovedDishes.map((d) => ({
                key: `${d.name}-${d.restaurant}`,
                main: d.name,
                sub: d.restaurant,
                right: d.count > 1 ? `${d.count} times` : 'loved',
              }))}
            />
          </Section>

          <Section title="Wine favorites">
            <List
              label="Favorite wines"
              items={review.favoriteWines.map((w) => ({
                key: w.wine.id,
                main: w.wine.name,
                sub: w.restaurant,
                right: `${w.average.toFixed(1)} avg`,
              }))}
            />
          </Section>

          {review.occasions.length > 0 && (
            <Section title="Occasions">
              <List
                label="Occasions"
                items={review.occasions.map((o) => ({
                  key: o.name,
                  main: o.name,
                  right: `${o.count}`,
                }))}
              />
            </Section>
          )}

          <p className="text-sm text-ink-muted">
            You said you&apos;d go again after {review.goAgainYes}{' '}
            {review.goAgainYes === 1 ? 'visit' : 'visits'}.
          </p>
        </div>
      )}
    </div>
  )
}
