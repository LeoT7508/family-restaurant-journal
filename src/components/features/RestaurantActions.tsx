import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { BottomSheet, Button, Icon, Input, Select, useToast } from '@/components/ui'
import {
  useDeleteRestaurant,
  useMergeRestaurants,
  useRestaurantFootprint,
  useUpdateRestaurant,
} from '@/hooks/actions'
import { numberOrUndefined } from '@/lib/forms'
import { restaurantFormSchema, type Restaurant, type RestaurantFormValues } from '@/types'
import type { RestaurantFootprint } from '@/lib/restaurantActions'

function RestaurantForm({
  defaultValues,
  saving,
  onSubmit,
  onCancel,
}: {
  defaultValues: RestaurantFormValues
  saving: boolean
  onSubmit: (values: RestaurantFormValues) => void
  onCancel: () => void
}) {
  const { register, handleSubmit, formState } = useForm<RestaurantFormValues>({
    resolver: zodResolver(restaurantFormSchema),
    defaultValues,
  })
  const { errors } = formState
  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Input label="Name" error={errors.name?.message} data-autofocus {...register('name')} />
      <Input label="Address" {...register('address')} />
      <Input label="Cuisine" error={errors.cuisine?.message} {...register('cuisine')} />
      <Select label="Price" {...register('priceLevel', { setValueAs: (v) => Number(v) })}>
        <option value={1}>$ (budget)</option>
        <option value={2}>$$ (moderate)</option>
        <option value={3}>$$$ (nice)</option>
        <option value={4}>$$$$ (splurge)</option>
      </Select>
      <Input
        label="Drive time from home (minutes)"
        type="number"
        inputMode="numeric"
        min={0}
        error={errors.driveMinutes?.message}
        {...register('driveMinutes', { setValueAs: numberOrUndefined })}
      />
      <div className="flex gap-2">
        <Button type="submit" loading={saving} fullWidth>
          Save
        </Button>
        <Button variant="ghost" onClick={onCancel} fullWidth>
          Cancel
        </Button>
      </div>
    </form>
  )
}

function summarize(f: RestaurantFootprint): string {
  const parts = [
    `${f.visits} ${f.visits === 1 ? 'visit' : 'visits'}`,
    f.dishes ? `${f.dishes} ${f.dishes === 1 ? 'dish' : 'dishes'}` : '',
    f.wines ? `${f.wines} ${f.wines === 1 ? 'wine' : 'wines'}` : '',
    f.allergyNotes ? `${f.allergyNotes} allergy ${f.allergyNotes === 1 ? 'note' : 'notes'}` : '',
    f.wishlist ? 'its wishlist entry' : '',
  ].filter(Boolean)
  return parts.join(', ')
}

type Panel = 'edit' | 'merge' | 'delete' | null

/** Fix, close, merge or delete a restaurant. */
export function RestaurantActions({
  restaurant,
  others,
}: {
  restaurant: Restaurant
  others: Restaurant[]
}) {
  const navigate = useNavigate()
  const toast = useToast()
  const update = useUpdateRestaurant()
  const merge = useMergeRestaurants()
  const remove = useDeleteRestaurant()
  const [panel, setPanel] = useState<Panel>(null)
  const [targetId, setTargetId] = useState('')
  const footprint = useRestaurantFootprint(restaurant.id, panel === 'merge' || panel === 'delete')
  const close = () => {
    setPanel(null)
    setTargetId('')
  }
  const isClosed = restaurant.status === 'closed'
  const sorted = [...others].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <>
      <div className="mb-6 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => setPanel('edit')}>
          <Icon name="pencil" size={18} /> Edit details
        </Button>
        <Button
          variant="secondary"
          loading={update.isPending}
          onClick={() =>
            update.mutate(
              { id: restaurant.id, patch: { status: isClosed ? 'open' : 'closed' } },
              {
                onSuccess: () =>
                  toast.show(
                    isClosed
                      ? `${restaurant.name} is open again.`
                      : `${restaurant.name} marked as closed. It won't be suggested anymore.`,
                  ),
                onError: (e) => toast.show(e.message, 'error'),
              },
            )
          }
        >
          {isClosed ? 'Mark as open again' : 'Mark as closed'}
        </Button>
        {others.length > 0 && (
          <Button variant="ghost" onClick={() => setPanel('merge')}>
            Merge duplicate
          </Button>
        )}
        <Button variant="ghost" onClick={() => setPanel('delete')}>
          <Icon name="trash" size={18} /> Delete
        </Button>
      </div>

      <BottomSheet open={panel === 'edit'} onClose={close} title="Edit restaurant">
        <RestaurantForm
          defaultValues={{
            name: restaurant.name,
            address: restaurant.address,
            cuisine: restaurant.cuisine,
            priceLevel: restaurant.priceLevel,
            driveMinutes: restaurant.driveMinutes,
          }}
          saving={update.isPending}
          onCancel={close}
          onSubmit={(values) =>
            update.mutate(
              { id: restaurant.id, patch: values },
              {
                onSuccess: () => {
                  toast.show('Restaurant updated.')
                  close()
                },
                onError: (e) => toast.show(e.message, 'error'),
              },
            )
          }
        />
      </BottomSheet>

      <BottomSheet open={panel === 'merge'} onClose={close} title="Merge a duplicate">
        <div className="flex flex-col gap-4">
          <p>
            Move everything from <strong className="font-medium">{restaurant.name}</strong> into
            another restaurant, then remove this one.
          </p>
          <Select
            label="Merge into"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            data-autofocus
          >
            <option value="">Choose the one to keep</option>
            {sorted.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.cuisine})
              </option>
            ))}
          </Select>
          {footprint.data && (
            <p className="text-sm text-ink-muted">This moves {summarize(footprint.data)}.</p>
          )}
          <div className="flex gap-2">
            <Button
              disabled={!targetId}
              loading={merge.isPending}
              fullWidth
              onClick={() =>
                merge.mutate(
                  { sourceId: restaurant.id, targetId },
                  {
                    onSuccess: () => {
                      toast.show('Merged.')
                      close()
                      navigate(`/restaurants/${targetId}`)
                    },
                    onError: (e) => toast.show(e.message, 'error'),
                  },
                )
              }
            >
              Merge
            </Button>
            <Button variant="ghost" onClick={close} fullWidth>
              Cancel
            </Button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet open={panel === 'delete'} onClose={close} title="Delete this restaurant?">
        <div className="flex flex-col gap-4">
          <p>
            This permanently deletes <strong className="font-medium">{restaurant.name}</strong>
            {footprint.data ? ` and ${summarize(footprint.data)}` : ''}. It can&apos;t be undone.
          </p>
          <p className="text-sm text-ink-muted">
            If it&apos;s a duplicate, use &ldquo;Merge duplicate&rdquo; instead to keep your visits.
          </p>
          <div className="flex gap-2">
            <Button
              variant="danger"
              loading={remove.isPending}
              fullWidth
              onClick={() =>
                remove.mutate(restaurant.id, {
                  onSuccess: () => {
                    toast.show('Restaurant deleted.')
                    close()
                    navigate('/journal')
                  },
                  onError: (e) => toast.show(e.message, 'error'),
                })
              }
            >
              Yes, delete it
            </Button>
            <Button variant="ghost" onClick={close} fullWidth data-autofocus>
              Keep it
            </Button>
          </div>
        </div>
      </BottomSheet>
    </>
  )
}
