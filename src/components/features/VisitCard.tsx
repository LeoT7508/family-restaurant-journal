import { Link } from 'react-router-dom'
import { StoredImage } from './StoredImage'
import { cn } from '@/lib/cn'
import { Badge, Card, Icon, Rating } from '@/components/ui'
import { describeDistance, formatDate, formatPrice } from '@/lib/format'
import type { FamilyMember, Restaurant, Visit } from '@/types'
import { AllergyBadges } from './AllergyBadges'

interface VisitCardProps {
  visit: Visit
  restaurant?: Restaurant
  members: FamilyMember[]
  /** Where tapping the card goes. Defaults to the visit page (or the log form for drafts). */
  to?: string
  selected?: boolean
}

export function VisitCard({ visit, restaurant, members, to, selected }: VisitCardProps) {
  const loggedBy = members.find((m) => m.id === visit.loggedBy)?.name
  const target = to ?? (visit.isDraft ? `/log/${visit.id}` : `/visits/${visit.id}`)
  const name = restaurant?.name ?? 'Unknown restaurant'
  return (
    <Card interactive className={cn('relative p-0', selected && 'border-2 border-accent')}>
      <div className="flex gap-3 p-4">
        {visit.photos[0] ? (
          <StoredImage
            src={visit.photos[0]}
            alt=""
            className="h-20 w-20 shrink-0 rounded-md object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent"
          >
            <Icon name="book" size={30} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg">
            <Link
              to={target}
              className="rounded-sm after:absolute after:inset-0 after:content-['']"
            >
              {name}
            </Link>
          </h3>
          <p className="text-sm text-ink-muted">
            {formatDate(visit.date)}
            {loggedBy ? ` · ${loggedBy}` : ''}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {visit.familyRating ? (
              <Rating label="Family rating" value={visit.familyRating} size={16} />
            ) : null}
            {visit.isDraft && (
              <Badge tone="highlight" icon="clock">
                Draft: finish later
              </Badge>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {restaurant?.status === 'closed' && <Badge tone="highlight">Closed</Badge>}
            {restaurant && <Badge>{restaurant.cuisine}</Badge>}
            {restaurant && <Badge>{formatPrice(restaurant.priceLevel)}</Badge>}
            {restaurant && <Badge icon="pin">{describeDistance(restaurant)}</Badge>}
            <AllergyBadges />
          </div>
        </div>
      </div>
    </Card>
  )
}
