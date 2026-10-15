import { useState } from 'react'
import { StoredImage } from './StoredImage'
import { Link, useNavigate } from 'react-router-dom'
import { AllergyNotes } from './AllergySection'
import { AllergyBadges } from './AllergyBadges'
import { CostsSection } from './CostsSection'
import { DishesSection } from './DishesSection'
import { KidInfoSection } from './KidInfoSection'
import { PageHeader } from './PageHeader'
import { ParentRatings } from './ParentRatings'
import { Section } from './Section'
import { ShareSheet } from './ShareSheet'
import { WineSection } from './WineSection'
import {
  Badge,
  Button,
  buttonStyles,
  Card,
  Chip,
  ErrorState,
  Icon,
  ListSkeleton,
  Rating,
  Segmented,
  useToast,
} from '@/components/ui'
import { useUpdateVisit } from '@/hooks/journal'
import { useDeleteVisit } from '@/hooks/actions'
import { useMembers, useRestaurants, useVisit } from '@/hooks/queries'
import { describeDistance, formatDate, formatPrice } from '@/lib/format'
import { OCCASIONS, type GoAgain } from '@/types'

export function VisitDetailView({
  visitId,
  embedded,
}: {
  visitId: string | undefined
  embedded?: boolean
}) {
  const navigate = useNavigate()
  const deleteVisit = useDeleteVisit()
  const [sharing, setSharing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const visit = useVisit(visitId)
  const restaurants = useRestaurants()
  const members = useMembers()
  const update = useUpdateVisit()
  const toast = useToast()

  if (visit.isLoading || restaurants.isLoading || members.isLoading)
    return <ListSkeleton rows={3} />
  if (visit.isError || restaurants.isError || members.isError) {
    return (
      <ErrorState
        onRetry={() => {
          void visit.refetch()
          void restaurants.refetch()
          void members.refetch()
        }}
      />
    )
  }
  if (!visit.data) {
    return <ErrorState title="We couldn't find that visit" message="It may have been deleted." />
  }

  const v = visit.data
  const all = members.data ?? []
  const parents = all.filter((m) => m.isParent)
  const restaurant = restaurants.data?.find((r) => r.id === v.restaurantId)
  const loggedBy = all.find((m) => m.id === v.loggedBy)?.name

  const patch = (changes: Parameters<typeof update.mutate>[0]['patch']) =>
    update.mutate({ id: v.id, patch: changes }, { onError: (e) => toast.show(e.message, 'error') })

  const setParentRating = (memberId: string, value: number | undefined) => {
    const next = { ...v.ratings }
    if (value === undefined) delete next[memberId]
    else next[memberId] = value
    patch({ ratings: next })
  }

  const occasionOptions = [
    ...OCCASIONS,
    ...v.occasions.filter((o) => !OCCASIONS.some((x) => x === o)),
  ]

  return (
    <div className={embedded ? undefined : 'mx-auto max-w-5xl'}>
      <PageHeader
        title={restaurant?.name ?? 'Visit'}
        subtitle={`${formatDate(v.date)}${loggedBy ? ` · logged by ${loggedBy}` : ''}`}
        action={
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            {restaurant && (
              <Button variant="secondary" onClick={() => setSharing(true)}>
                Share
              </Button>
            )}
            <Link to={`/log/${v.id}`} className={buttonStyles('secondary')}>
              Edit basics
            </Link>
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {restaurant && (
          <>
            <Badge>{restaurant.cuisine}</Badge>
            <Badge>{formatPrice(restaurant.priceLevel)}</Badge>
            <Badge icon="pin">{describeDistance(restaurant)}</Badge>
            {restaurant.status === 'closed' && <Badge tone="highlight">Closed</Badge>}
            <Link
              to={`/restaurants/${restaurant.id}`}
              className="font-medium text-accent underline-offset-4 hover:underline"
            >
              All visits and notes
            </Link>
          </>
        )}
        <AllergyBadges />
        {v.isDraft && (
          <Badge tone="highlight" icon="clock">
            Draft
          </Badge>
        )}
        {v.isDraft && (
          <Button
            onClick={() => {
              patch({ isDraft: false })
              toast.show('Marked complete.')
            }}
          >
            Mark complete
          </Button>
        )}
      </div>

      <div className={embedded ? 'flex flex-col gap-8' : 'grid grid-cols-1 gap-8 lg:grid-cols-2'}>
        <div className="flex flex-col gap-8">
          {v.photos[0] && (
            <StoredImage
              src={v.photos[0]}
              alt=""
              className="max-h-80 w-full rounded-lg object-cover"
            />
          )}

          <Section title="Ratings">
            <Card className="flex flex-col gap-4">
              <ParentRatings parents={parents} ratings={v.ratings} onChange={setParentRating} />
              <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
                <span className="w-20 shrink-0 font-medium">Family</span>
                <Rating
                  label="Family rating"
                  value={v.familyRating}
                  onChange={(value) => patch({ familyRating: value })}
                  size={24}
                />
              </div>
            </Card>
          </Section>

          <Section title="Go again?">
            <Segmented<GoAgain>
              label="Go again?"
              value={v.goAgain}
              onChange={(goAgain) => patch({ goAgain })}
              options={[
                { value: 'yes', label: 'Yes' },
                { value: 'maybe', label: 'Maybe' },
                { value: 'never', label: 'Never' },
              ]}
            />
          </Section>

          <Section title="Occasion">
            <ul className="flex flex-wrap gap-2" aria-label="Occasion">
              {occasionOptions.map((o) => {
                const selected = v.occasions.includes(o)
                return (
                  <li key={o}>
                    <Chip
                      selected={selected}
                      onClick={() =>
                        patch({
                          occasions: selected
                            ? v.occasions.filter((x) => x !== o)
                            : [...v.occasions, o],
                        })
                      }
                    >
                      {o}
                    </Chip>
                  </li>
                )
              })}
            </ul>
          </Section>

          <CostsSection visit={v} />

          {v.notes && (
            <Section title="Notes">
              <Card>
                <p>{v.notes}</p>
              </Card>
            </Section>
          )}
        </div>

        <div className="flex flex-col gap-8">
          <DishesSection visit={v} members={all} />
          <WineSection visit={v} members={all} />
          <KidInfoSection visit={v} members={all} />
          <AllergyNotes restaurantId={v.restaurantId} members={all} />
        </div>
      </div>

      <div className="mt-10 border-t border-line pt-4">
        {confirmingDelete ? (
          <div className="flex flex-col gap-3">
            <p>
              Delete this visit? Its dishes, wine and kid notes go too. Allergy notes belong to the
              restaurant and stay.
            </p>
            <div className="flex gap-2">
              <Button
                variant="danger"
                loading={deleteVisit.isPending}
                onClick={() =>
                  deleteVisit.mutate(v.id, {
                    onSuccess: () => {
                      toast.show('Visit deleted.')
                      navigate('/journal')
                    },
                    onError: (e) => toast.show(e.message, 'error'),
                  })
                }
              >
                Yes, delete this visit
              </Button>
              <Button variant="ghost" onClick={() => setConfirmingDelete(false)}>
                Keep it
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="ghost" onClick={() => setConfirmingDelete(true)}>
            <Icon name="trash" size={18} /> Delete visit
          </Button>
        )}
      </div>

      {restaurant && (
        <ShareSheet
          open={sharing}
          onClose={() => setSharing(false)}
          visit={v}
          restaurant={restaurant}
          members={all}
        />
      )}
    </div>
  )
}
