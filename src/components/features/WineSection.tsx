import { useState } from 'react'
import { StoredImage } from './StoredImage'
import { Link } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Badge,
  BottomSheet,
  Button,
  Card,
  Chip,
  Icon,
  Input,
  Segmented,
  TextArea,
  useToast,
} from '@/components/ui'
import { useDeleteWine, useDishes, useSaveWine, useWines } from '@/hooks/journal'
import { numberOrUndefined } from '@/lib/forms'
import { formatDate, formatMoney } from '@/lib/format'
import { EMPTY_WINE, isFavoriteWine, wineToForm } from '@/lib/wine'
import {
  wineFormSchema,
  type DishEntry,
  type FamilyMember,
  type Visit,
  type WineEntry,
  type WineFormValues,
} from '@/types'
import { ParentRatings } from './ParentRatings'
import { PhotoField } from './PhotoField'
import { Section } from './Section'

interface WineFormProps {
  parents: FamilyMember[]
  dishes: DishEntry[]
  defaultValues: WineFormValues
  saving?: boolean
  onSubmit: (values: WineFormValues) => void
  onCancel: () => void
  onDelete?: () => void
  deleting?: boolean
}

export function WineForm({
  parents,
  dishes,
  defaultValues,
  saving,
  onSubmit,
  onCancel,
  onDelete,
  deleting,
}: WineFormProps) {
  const { register, control, handleSubmit, formState } = useForm<WineFormValues>({
    resolver: zodResolver(wineFormSchema),
    defaultValues,
  })
  const { errors } = formState
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <Input label="Wine" error={errors.name?.message} data-autofocus {...register('name')} />
      <Input label="Producer" {...register('producer')} />
      <Input label="Grape or region" {...register('grapeOrRegion')} />
      <Controller
        control={control}
        name="servingType"
        render={({ field }) => (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Served as</span>
            <Segmented
              label="Served as"
              options={[
                { value: 'glass', label: 'Glass' },
                { value: 'bottle', label: 'Bottle' },
              ]}
              value={field.value}
              onChange={field.onChange}
            />
          </div>
        )}
      />
      <Input
        label="Price"
        type="number"
        inputMode="decimal"
        min={0}
        step="0.01"
        error={errors.price?.message}
        {...register('price', { setValueAs: numberOrUndefined })}
      />
      <Controller
        control={control}
        name="ratings"
        render={({ field }) => (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Ratings</span>
            <ParentRatings
              parents={parents}
              ratings={field.value}
              size={26}
              onChange={(id, value) => {
                const next = { ...field.value }
                if (value === undefined) delete next[id]
                else next[id] = value
                field.onChange(next)
              }}
            />
          </div>
        )}
      />
      <TextArea
        label="Tasting note"
        maxLength={500}
        error={errors.tastingNote?.message}
        {...register('tastingNote')}
      />
      <Controller
        control={control}
        name="labelPhoto"
        render={({ field }) => (
          <PhotoField label="Label photo" value={field.value} onChange={field.onChange} />
        )}
      />
      {dishes.length > 0 && (
        <Controller
          control={control}
          name="pairedDishIds"
          render={({ field }) => (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-medium">Paired with</legend>
              <div className="flex flex-wrap gap-2">
                {dishes.map((d) => {
                  const selected = field.value.includes(d.id)
                  return (
                    <Chip
                      key={d.id}
                      selected={selected}
                      onClick={() =>
                        field.onChange(
                          selected ? field.value.filter((x) => x !== d.id) : [...field.value, d.id],
                        )
                      }
                    >
                      {d.name}
                    </Chip>
                  )
                })}
              </div>
            </fieldset>
          )}
        />
      )}
      <div className="flex gap-2">
        <Button type="submit" loading={saving} fullWidth>
          Save wine
        </Button>
        <Button variant="ghost" onClick={onCancel} fullWidth>
          Cancel
        </Button>
      </div>
      {onDelete && (
        <div className="border-t border-line pt-3">
          {confirmDelete ? (
            <div className="flex gap-2">
              <Button variant="danger" loading={deleting} onClick={onDelete} fullWidth>
                Yes, delete this wine
              </Button>
              <Button variant="ghost" onClick={() => setConfirmDelete(false)} fullWidth>
                Keep
              </Button>
            </div>
          ) : (
            <Button variant="ghost" onClick={() => setConfirmDelete(true)}>
              <Icon name="trash" size={18} /> Delete wine
            </Button>
          )}
        </div>
      )}
    </form>
  )
}

interface WineCardProps {
  wine: WineEntry
  parents: FamilyMember[]
  /** Where this wine was had, shown as a link to the visit. */
  where?: { visit: Visit; restaurantName: string }
  onEdit?: () => void
}

/** One wine with both parents' ratings side by side. */
export function WineCard({ wine, parents, where, onEdit }: WineCardProps) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        {wine.labelPhoto && (
          <StoredImage
            src={wine.labelPhoto}
            alt="Wine label"
            className="h-20 w-16 rounded-md object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <h3 className="text-lg">{wine.name}</h3>
          <p className="text-sm text-ink-muted">
            {[wine.producer, wine.grapeOrRegion].filter(Boolean).join(' · ')}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Badge>{wine.servingType === 'glass' ? 'Glass' : 'Bottle'}</Badge>
            {wine.price !== undefined && <Badge>{formatMoney(wine.price)}</Badge>}
            {isFavoriteWine(wine) && (
              <Badge tone="highlight" icon="star">
                Favorite
              </Badge>
            )}
          </div>
        </div>
        {onEdit && (
          <Button variant="ghost" onClick={onEdit} aria-label={`Edit ${wine.name}`}>
            <Icon name="pencil" size={20} />
          </Button>
        )}
      </div>
      <ParentRatings parents={parents} ratings={wine.ratings} size={20} />
      {wine.tastingNote && <p>{wine.tastingNote}</p>}
      {where && (
        <Link
          to={`/visits/${where.visit.id}`}
          className="text-sm font-medium text-accent underline-offset-4 hover:underline"
        >
          {where.restaurantName} · {formatDate(where.visit.date)}
        </Link>
      )}
    </Card>
  )
}

/** The wines for one visit, with add/edit. */
export function WineSection({ visit, members }: { visit: Visit; members: FamilyMember[] }) {
  const wines = useWines()
  const dishes = useDishes()
  const save = useSaveWine()
  const remove = useDeleteWine()
  const toast = useToast()
  const [editing, setEditing] = useState<WineEntry | 'new' | null>(null)
  const parents = members.filter((m) => m.isParent)
  const mine = (wines.data ?? []).filter((w) => w.visitId === visit.id)
  const visitDishes = (dishes.data ?? []).filter((d) => d.visitId === visit.id)
  const close = () => setEditing(null)

  return (
    <Section
      title="Wine"
      action={
        <Button variant="secondary" onClick={() => setEditing('new')}>
          <Icon name="plus" size={18} /> Add wine
        </Button>
      }
    >
      {mine.length === 0 ? (
        <p className="rounded-md bg-surface-2 p-4 text-ink-muted">No wine logged for this visit.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {mine.map((w) => (
            <li key={w.id}>
              <WineCard wine={w} parents={parents} onEdit={() => setEditing(w)} />
            </li>
          ))}
        </ul>
      )}
      <BottomSheet
        open={editing !== null}
        onClose={close}
        title={editing === 'new' ? 'Add wine' : 'Edit wine'}
      >
        {editing && (
          <WineForm
            key={editing === 'new' ? 'new' : editing.id}
            parents={parents}
            dishes={visitDishes}
            defaultValues={editing === 'new' ? EMPTY_WINE : wineToForm(editing)}
            saving={save.isPending}
            deleting={remove.isPending}
            onCancel={close}
            onSubmit={(values) => {
              const id = editing !== 'new' ? editing.id : undefined
              save.mutate(
                { id, values: { ...values, visitId: visit.id } },
                {
                  onSuccess: () => {
                    toast.show(id ? 'Wine updated.' : 'Wine added.')
                    close()
                  },
                  onError: (e) => toast.show(e.message, 'error'),
                },
              )
            }}
            onDelete={
              editing !== 'new'
                ? () =>
                    remove.mutate(editing.id, {
                      onSuccess: () => {
                        toast.show('Wine deleted.')
                        close()
                      },
                      onError: (e) => toast.show(e.message, 'error'),
                    })
                : undefined
            }
          />
        )}
      </BottomSheet>
    </Section>
  )
}
