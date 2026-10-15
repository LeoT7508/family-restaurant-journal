import { Link } from 'react-router-dom'
import { buttonStyles, Card, EmptyState, ErrorState, Icon, ListSkeleton } from '@/components/ui'
import { VisitCard } from '@/components/features/VisitCard'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useMembers, useRestaurants, useVisits } from '@/hooks/queries'
import { useRecommendContext } from '@/hooks/useRecommendContext'
import { SuggestionCard } from '@/components/features/SuggestionCard'
import { DEFAULT_ANSWERS, recommend } from '@/lib/recommend'
import { useHousehold } from '@/hooks/queries'

const FIRST_RUN_GOAL = 3

export default function Home() {
  const { member } = useCurrentUser()
  const visits = useVisits()
  const restaurants = useRestaurants()
  const members = useMembers()
  const household = useHousehold()
  const rec = useRecommendContext()

  const isLoading = visits.isLoading || restaurants.isLoading || members.isLoading
  const isError = visits.isError || restaurants.isError || members.isError
  const retry = () => {
    void visits.refetch()
    void restaurants.refetch()
    void members.refetch()
  }

  const all = visits.data ?? []
  const drafts = all.filter((v) => v.isDraft)
  const recent = all.filter((v) => !v.isDraft).slice(0, 5)
  const ideas =
    rec.ctx && all.some((v) => !v.isDraft)
      ? recommend(
          { ...DEFAULT_ANSWERS, maxDriveMinutes: household.data?.driveRadiusMinutes ?? 20 },
          rec.ctx,
          { limit: 3, includeNew: false },
        ).suggestions
      : []
  const byId = new Map((restaurants.data ?? []).map((r) => [r.id, r]))

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="hello">
        <h1 id="hello" className="text-2xl md:text-3xl">
          {member ? `Hi ${member.name}` : 'Welcome'}, where did we eat?
        </h1>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link to="/log" className={buttonStyles('primary', 'lg', true)}>
            <Icon name="plus" /> Log a visit
          </Link>
          <Link to="/tonight" className={buttonStyles('secondary', 'lg', true)}>
            <Icon name="sparkle" /> Where tonight?
          </Link>
        </div>
      </section>

      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : isError ? (
        <ErrorState onRetry={retry} />
      ) : all.length === 0 ? (
        <EmptyState
          icon="book"
          title="Start your journal with 3 favorite meals"
          description={`Think of the last ${FIRST_RUN_GOAL} places you loved. Search, tap, add a star rating, and you're done in seconds.`}
          action={
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm font-medium text-ink-muted">0 of {FIRST_RUN_GOAL} logged</p>
              <Link to="/log" className={buttonStyles('primary', 'lg')}>
                Log your first favorite
              </Link>
            </div>
          }
        />
      ) : (
        <>
          {drafts.length > 0 && (
            <section aria-labelledby="drafts" className="flex flex-col gap-3">
              <h2 id="drafts" className="text-xl">
                Finish logging
              </h2>
              <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {drafts.map((v) => (
                  <li key={v.id}>
                    <VisitCard
                      visit={v}
                      restaurant={byId.get(v.restaurantId)}
                      members={members.data ?? []}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section aria-labelledby="recent" className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 id="recent" className="text-xl">
                Recent visits
              </h2>
              <Link
                to="/journal"
                className="font-medium text-accent underline-offset-4 hover:underline"
              >
                See all
              </Link>
            </div>
            {recent.length === 0 ? (
              <Card className="text-ink-muted">
                No finished visits yet. Complete a draft above.
              </Card>
            ) : (
              <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {recent.map((v) => (
                  <li key={v.id}>
                    <VisitCard
                      visit={v}
                      restaurant={byId.get(v.restaurantId)}
                      members={members.data ?? []}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
          {ideas.length > 0 && (
            <section aria-labelledby="ideas" className="flex flex-col gap-3">
              <div>
                <h2 id="ideas" className="text-xl">
                  Ideas from your history
                </h2>
                <p className="text-sm text-ink-muted">
                  Picked from places you've been and your wishlist, within your drive-time radius.
                </p>
              </div>
              <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {ideas.map((s) => (
                  <li key={s.key}>
                    <SuggestionCard suggestion={s} compact />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}
