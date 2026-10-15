import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/features/PageHeader'
import { RestaurantSearch } from '@/components/features/RestaurantSearch'
import { AllergyBadges } from '@/components/features/AllergyBadges'
import {
  Badge,
  BottomSheet,
  Button,
  buttonStyles,
  Card,
  EmptyState,
  ErrorState,
  Icon,
  ListSkeleton,
  TextArea,
  useToast,
} from '@/components/ui'
import { useMembers, useRestaurants } from '@/hooks/queries'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useAddToWishlist, useRemoveFromWishlist, useWishlist } from '@/hooks/wishlist'
import { useUpdateWishlistNote } from '@/hooks/actions'
import { describeDistance, formatPrice } from '@/lib/format'
import type { PlaceResult, WishlistItem } from '@/types'

export default function Wishlist() {
  const wishlist = useWishlist()
  const restaurants = useRestaurants()
  const members = useMembers()
  const { member } = useCurrentUser()
  const add = useAddToWishlist()
  const remove = useRemoveFromWishlist()
  const updateNote = useUpdateWishlistNote()
  const [editing, setEditing] = useState<WishlistItem | null>(null)
  const [noteDraft, setNoteDraft] = useState('')
  const toast = useToast()

  const [adding, setAdding] = useState(false)
  const [place, setPlace] = useState<PlaceResult | null>(null)
  const [note, setNote] = useState('')
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  const byId = new Map((restaurants.data ?? []).map((r) => [r.id, r]))
  const nameOf = (id: string) => members.data?.find((m) => m.id === id)?.name ?? 'Someone'
  const queries = [wishlist, restaurants, members]

  const closeSheet = () => {
    setAdding(false)
    setPlace(null)
    setNote('')
  }

  const submit = () => {
    if (!place || !member) return
    add.mutate(
      { place, addedBy: member.id, note },
      {
        onSuccess: (r) => {
          toast.show(
            r.alreadyThere ? `${place.name} is already on the list.` : `${place.name} added.`,
          )
          closeSheet()
        },
        onError: (e) => toast.show(e.message, 'error'),
      },
    )
  }

  const onRemove = (item: WishlistItem) =>
    remove.mutate(item.id, {
      onSuccess: () => {
        toast.show('Removed from the wishlist.')
        setConfirmingId(null)
      },
      onError: (e) => toast.show(e.message, 'error'),
    })

  return (
    <div>
      <PageHeader
        title="Wishlist"
        subtitle="Places we want to try, together."
        action={
          <Button onClick={() => setAdding(true)}>
            <Icon name="plus" size={18} /> Add place
          </Button>
        }
      />

      {queries.some((q) => q.isLoading) ? (
        <ListSkeleton rows={3} />
      ) : queries.some((q) => q.isError) ? (
        <ErrorState onRetry={() => queries.forEach((q) => void q.refetch())} />
      ) : (wishlist.data ?? []).length === 0 ? (
        <EmptyState
          icon="heart"
          title="Nothing on the wishlist yet"
          description="Add places you've heard about, and they'll show up in Where tonight? too."
          action={<Button onClick={() => setAdding(true)}>Add a place</Button>}
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {wishlist.data?.map((item) => {
            const r = byId.get(item.restaurantId)
            if (!r) return null
            return (
              <li key={item.id}>
                <Card className="flex h-full flex-col gap-3">
                  <div>
                    <h3 className="text-lg">
                      <Link
                        to={`/restaurants/${r.id}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {r.name}
                      </Link>
                    </h3>
                    <p className="text-sm text-ink-muted">{r.address}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {r.status === 'closed' && (
                        <Badge tone="highlight" icon="alert">
                          Closed
                        </Badge>
                      )}
                      <Badge>{r.cuisine}</Badge>
                      <Badge>{formatPrice(r.priceLevel)}</Badge>
                      <Badge icon="pin">{describeDistance(r)}</Badge>
                      <AllergyBadges />
                    </div>
                  </div>
                  {item.note && <p>{item.note}</p>}
                  <p className="text-sm text-ink-muted">Added by {nameOf(item.addedBy)}</p>
                  <div className="mt-auto flex flex-wrap items-center gap-2">
                    <Link
                      to={`/log?restaurant=${r.id}&wish=${item.id}`}
                      className={buttonStyles('primary')}
                    >
                      <Icon name="check" size={18} /> Mark as visited
                    </Link>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setEditing(item)
                        setNoteDraft(item.note)
                      }}
                      aria-label={`Edit note for ${r.name}`}
                    >
                      <Icon name="pencil" size={18} /> Note
                    </Button>
                    {confirmingId === item.id ? (
                      <>
                        <Button
                          variant="danger"
                          loading={remove.isPending}
                          onClick={() => onRemove(item)}
                        >
                          Yes, remove
                        </Button>
                        <Button variant="ghost" onClick={() => setConfirmingId(null)}>
                          Keep
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="ghost"
                        onClick={() => setConfirmingId(item.id)}
                        aria-label={`Remove ${r.name} from the wishlist`}
                      >
                        <Icon name="trash" size={18} /> Remove
                      </Button>
                    )}
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      <BottomSheet open={editing !== null} onClose={() => setEditing(null)} title="Edit note">
        <div className="flex flex-col gap-4">
          <TextArea
            label="Why this one?"
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            maxLength={300}
            data-autofocus
          />
          <div className="flex gap-2">
            <Button
              loading={updateNote.isPending}
              fullWidth
              onClick={() =>
                editing &&
                updateNote.mutate(
                  { id: editing.id, note: noteDraft },
                  {
                    onSuccess: () => {
                      toast.show('Note saved.')
                      setEditing(null)
                    },
                    onError: (e) => toast.show(e.message, 'error'),
                  },
                )
              }
            >
              Save
            </Button>
            <Button variant="ghost" onClick={() => setEditing(null)} fullWidth>
              Cancel
            </Button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet open={adding} onClose={closeSheet} title="Add to the wishlist">
        <div className="flex flex-col gap-4">
          <RestaurantSearch value={place} onChange={setPlace} />
          {place && (
            <>
              <TextArea
                label="Why this one? (optional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={300}
              />
              <Button onClick={submit} loading={add.isPending} fullWidth>
                Add to wishlist
              </Button>
            </>
          )}
        </div>
      </BottomSheet>
    </div>
  )
}
