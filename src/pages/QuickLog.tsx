import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/features/PageHeader'
import { QuickLogForm, type QuickLogSubmit } from '@/components/features/QuickLogForm'
import { ErrorState, ListSkeleton, useToast } from '@/components/ui'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { usePlace, useRestaurants, useSaveQuickLog, useVisit } from '@/hooks/queries'
import { useRemoveFromWishlist } from '@/hooks/wishlist'
import { todayISO } from '@/lib/format'
import type { PlaceResult, QuickLogFormValues, Restaurant } from '@/types'

const toPlace = (r: Restaurant): PlaceResult => ({
  placeId: r.placeId,
  name: r.name,
  address: r.address,
  cuisine: r.cuisine,
  priceLevel: r.priceLevel,
  driveMinutes: r.driveMinutes,
  tags: r.tags,
})

export default function QuickLog() {
  const { visitId } = useParams()
  const [params] = useSearchParams()
  // Prefill from elsewhere in the app: a saved restaurant, a not-yet-saved place, or a wishlist item to clear.
  const prefillRestaurantId = params.get('restaurant')
  const prefillPlaceId = params.get('place')
  const wishId = params.get('wish')
  const navigate = useNavigate()
  const toast = useToast()
  const { member } = useCurrentUser()
  const visit = useVisit(visitId)
  const restaurants = useRestaurants()
  const save = useSaveQuickLog()
  const removeWish = useRemoveFromWishlist()
  const prefillPlace = usePlace(prefillPlaceId)

  if (
    (visitId || prefillRestaurantId || prefillPlaceId) &&
    (visit.isLoading || restaurants.isLoading || prefillPlace.isLoading)
  ) {
    return <ListSkeleton rows={2} />
  }
  if (visit.isError || restaurants.isError) {
    return (
      <ErrorState
        onRetry={() => {
          void visit.refetch()
          void restaurants.refetch()
        }}
      />
    )
  }
  if (visitId && !visit.data) {
    return <ErrorState title="We couldn't find that visit" message="It may have been deleted." />
  }

  const existing = visit.data ?? undefined
  const restaurant = existing
    ? restaurants.data?.find((r) => r.id === existing.restaurantId)
    : undefined
  const prefilled = existing
    ? undefined
    : prefillRestaurantId
      ? restaurants.data?.find((r) => r.id === prefillRestaurantId)
      : undefined
  const defaultPlace: PlaceResult | null = restaurant
    ? toPlace(restaurant)
    : prefilled
      ? toPlace(prefilled)
      : (prefillPlace.data ?? null)
  const defaults: QuickLogFormValues = {
    placeId: defaultPlace?.placeId ?? '',
    date: existing?.date ?? todayISO(),
    familyRating: existing?.familyRating,
    note: existing?.notes ?? '',
  }

  const onSubmit = ({ place, values, photo, complete }: QuickLogSubmit) => {
    if (!member) {
      toast.show('Choose who is logging first.', 'error')
      return
    }
    save.mutate(
      {
        visitId: existing?.id,
        place,
        date: values.date,
        loggedBy: existing?.loggedBy ?? member.id,
        familyRating: values.familyRating,
        note: values.note,
        photo,
        complete,
      },
      {
        onSuccess: () => {
          // Logging a wishlist place counts as visiting it, so it leaves the wishlist.
          if (wishId) removeWish.mutate(wishId)
          toast.show(complete ? 'Saved to your journal.' : 'Draft saved. Finish it anytime.')
          navigate('/')
        },
        onError: (error) => toast.show(error.message, 'error'),
      },
    )
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title={existing ? 'Finish this visit' : 'Log a visit'}
        subtitle="Pick the place, add a star rating, and you're done."
      />
      <QuickLogForm
        defaultValues={defaults}
        defaultPlace={defaultPlace}
        defaultPhoto={existing?.photos[0]}
        existing={existing ? { isDraft: existing.isDraft } : undefined}
        saving={save.isPending}
        onSubmit={onSubmit}
      />
    </div>
  )
}
