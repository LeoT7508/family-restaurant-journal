import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Badge, Button, Card, Icon, Input, ListSkeleton, Select } from '@/components/ui'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useHousehold, usePlaceSearch } from '@/hooks/queries'
import { numberOrUndefined } from '@/lib/forms'
import { tripTag } from '@/lib/trip'
import { manualPlaceFormSchema, type ManualPlaceFormValues } from '@/types'
import { describeDistance, formatPrice } from '@/lib/format'
import type { PlaceResult } from '@/types'
import { AllergyBadges } from './AllergyBadges'

interface RestaurantSearchProps {
  value: PlaceResult | null
  onChange: (place: PlaceResult | null) => void
  error?: string
}

function PlaceSummary({ place }: { place: PlaceResult }) {
  return (
    <>
      <span className="block text-base font-semibold">{place.name}</span>
      <span className="block text-sm text-ink-muted">{place.address}</span>
      <span className="mt-1.5 flex flex-wrap gap-1.5">
        <Badge>{place.cuisine}</Badge>
        <Badge>{formatPrice(place.priceLevel)}</Badge>
        <Badge icon="pin">{describeDistance(place)}</Badge>
        <AllergyBadges />
      </span>
    </>
  )
}

const newManualId = () =>
  `manual:${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Date.now()}`

/** For places search can't find, and for anything eaten while travelling. */
function ManualPlaceForm({
  travelDestination,
  onAdd,
  onCancel,
}: {
  travelDestination?: string
  onAdd: (place: PlaceResult) => void
  onCancel: () => void
}) {
  const { register, handleSubmit, formState } = useForm<ManualPlaceFormValues>({
    resolver: zodResolver(manualPlaceFormSchema),
    defaultValues: { name: '', cuisine: '', address: '', priceLevel: 2, driveMinutes: 0 },
  })
  const { errors } = formState
  return (
    <form
      noValidate
      onSubmit={handleSubmit((v) =>
        onAdd({
          placeId: newManualId(),
          name: v.name,
          cuisine: v.cuisine,
          address: v.address || (travelDestination ?? ''),
          priceLevel: v.priceLevel,
          driveMinutes: travelDestination ? 0 : v.driveMinutes,
          tags: travelDestination ? [tripTag(travelDestination)] : ['added-by-us'],
        }),
      )}
      className="flex flex-col gap-3 rounded-lg border border-line bg-surface-2 p-4"
    >
      <p className="font-medium">Add it yourself</p>
      {travelDestination && (
        <p className="text-sm text-ink-muted">
          Travel mode is on, so this is saved as part of your {travelDestination} trip.
        </p>
      )}
      <Input
        label="Restaurant name"
        error={errors.name?.message}
        data-autofocus
        {...register('name')}
      />
      <Input label="Cuisine" error={errors.cuisine?.message} {...register('cuisine')} />
      <Input label="Address or city (optional)" {...register('address')} />
      <Select label="Price" {...register('priceLevel', { setValueAs: (v) => Number(v) })}>
        <option value={1}>$ (budget)</option>
        <option value={2}>$$ (moderate)</option>
        <option value={3}>$$$ (nice)</option>
        <option value={4}>$$$$ (splurge)</option>
      </Select>
      {!travelDestination && (
        <Input
          label="Drive time from home (minutes)"
          type="number"
          inputMode="numeric"
          min={0}
          error={errors.driveMinutes?.message}
          {...register('driveMinutes', { setValueAs: numberOrUndefined })}
        />
      )}
      <div className="flex gap-2">
        <Button type="submit" fullWidth>
          Use this place
        </Button>
        <Button variant="ghost" onClick={onCancel} fullWidth>
          Cancel
        </Button>
      </div>
    </form>
  )
}

/** Search the (mock) places list, tap a result to confirm it. */
export function RestaurantSearch({ value, onChange, error }: RestaurantSearchProps) {
  const [query, setQuery] = useState('')
  const [manual, setManual] = useState(false)
  const household = useHousehold()
  const travelDestination = household.data?.travel?.destination
  const debounced = useDebouncedValue(query)
  const results = usePlaceSearch(debounced)

  if (value) {
    return (
      <Card className="flex items-start gap-3 border-2 border-sage bg-sage-soft/40">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sage text-accent-ink">
          <Icon name="check" size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-sage">Restaurant</p>
          <PlaceSummary place={value} />
        </div>
        <Button
          variant="ghost"
          onClick={() => onChange(null)}
          aria-label={`Change restaurant, currently ${value.name}`}
        >
          Change
        </Button>
      </Card>
    )
  }

  if (manual) {
    return (
      <ManualPlaceForm
        travelDestination={travelDestination}
        onAdd={(place) => {
          setManual(false)
          onChange(place)
        }}
        onCancel={() => setManual(false)}
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {travelDestination && (
        <p className="rounded-md bg-accent-soft p-3 text-sm text-accent">
          Travel mode ({travelDestination}): search only knows places near home, so add where you
          ate by name.
        </p>
      )}
      <Input
        label="Where did you eat?"
        type="search"
        placeholder="Search by name or cuisine"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        error={error}
        autoComplete="off"
        enterKeyHint="search"
      />
      {results.isLoading ? (
        <ListSkeleton rows={3} />
      ) : results.isError ? (
        <p role="alert" className="text-danger">
          Search isn&apos;t working right now. Try again in a moment.
        </p>
      ) : results.data && results.data.length > 0 ? (
        <>
          <p className="text-sm font-medium text-ink-muted">
            {debounced ? 'Matches' : 'Closest to home'}
          </p>
          <ul className="flex flex-col gap-2" aria-label="Restaurant results">
            {results.data.map((place) => (
              <li key={place.placeId}>
                <button
                  type="button"
                  onClick={() => onChange(place)}
                  className="w-full rounded-lg border-2 border-line bg-surface p-3.5 text-left transition-colors hover:border-accent"
                >
                  <PlaceSummary place={place} />
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="rounded-md bg-surface-2 p-4 text-ink-muted">
          No matches for &ldquo;{debounced}&rdquo;. Try a cuisine like &ldquo;pizza&rdquo;.
        </p>
      )}
      <Button variant="ghost" onClick={() => setManual(true)} className="self-start">
        <Icon name="plus" size={18} /> Can&apos;t find it? Add it yourself
      </Button>
    </div>
  )
}
