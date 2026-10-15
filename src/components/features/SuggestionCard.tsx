import { Link } from 'react-router-dom'
import { Badge, Button, buttonStyles, Card, useToast } from '@/components/ui'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useAddToWishlist } from '@/hooks/wishlist'
import { describeDistance, formatPrice } from '@/lib/format'
import type { Suggestion } from '@/lib/recommend'
import { AllergyBadges } from './AllergyBadges'

const SOURCE_LABEL = {
  journal: 'From your journal',
  wishlist: 'On your wishlist',
  new: 'New to you',
} as const

/** One suggested place with the reasons it was picked. */
export function SuggestionCard({
  suggestion,
  compact,
}: {
  suggestion: Suggestion
  compact?: boolean
}) {
  const { place, restaurant, source, reasons } = suggestion
  const { member } = useCurrentUser()
  const add = useAddToWishlist()
  const toast = useToast()

  const logTo = restaurant
    ? `/log?restaurant=${restaurant.id}`
    : `/log?place=${encodeURIComponent(place.placeId)}`

  return (
    <Card className="flex flex-col gap-3">
      <div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge
            tone={source === 'journal' ? 'accent' : source === 'wishlist' ? 'highlight' : 'neutral'}
          >
            {SOURCE_LABEL[source]}
          </Badge>
        </div>
        <h3 className="mt-1.5 text-lg">{place.name}</h3>
        <p className="text-sm text-ink-muted">{place.address}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge>{place.cuisine}</Badge>
          <Badge>{formatPrice(place.priceLevel)}</Badge>
          <Badge icon="pin">{describeDistance(place)}</Badge>
          <AllergyBadges />
        </div>
      </div>
      <ul className="flex flex-col gap-1 text-sm" aria-label={`Why ${place.name}`}>
        {reasons.map((r) => (
          <li key={r} className="flex gap-2">
            <span
              aria-hidden="true"
              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
            />
            {r}
          </li>
        ))}
      </ul>
      {!compact && (
        <div className="flex flex-wrap gap-2">
          <Link to={logTo} className={buttonStyles('primary')}>
            Log a visit here
          </Link>
          {restaurant ? (
            <Link to={`/restaurants/${restaurant.id}`} className={buttonStyles('secondary')}>
              Details
            </Link>
          ) : (
            <Button
              variant="secondary"
              loading={add.isPending}
              disabled={!member}
              onClick={() =>
                member &&
                add.mutate(
                  { place, addedBy: member.id, note: '' },
                  {
                    onSuccess: (r) =>
                      toast.show(
                        r.alreadyThere
                          ? 'Already on your wishlist.'
                          : `${place.name} added to your wishlist.`,
                      ),
                    onError: (e) => toast.show(e.message, 'error'),
                  },
                )
              }
            >
              Add to wishlist
            </Button>
          )}
        </div>
      )}
      {compact && restaurant && (
        <Link
          to={`/restaurants/${restaurant.id}`}
          className="text-sm font-medium text-accent underline-offset-4 hover:underline"
        >
          Details
        </Link>
      )}
    </Card>
  )
}
