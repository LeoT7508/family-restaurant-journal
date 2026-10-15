import { useEffect, useMemo, useState } from 'react'
import { StoredImage } from './StoredImage'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Icon, Input, Rating, TextArea } from '@/components/ui'
import { CONFIRM_PROMPT } from '@/lib/allergy'
import { cn } from '@/lib/cn'
import { quickLogFormSchema, type PlaceResult, type QuickLogFormValues } from '@/types'
import { AllergyBadges } from './AllergyBadges'
import { RestaurantSearch } from './RestaurantSearch'

export interface QuickLogSubmit {
  place: PlaceResult
  values: QuickLogFormValues
  photo?: File | string
  complete: boolean
}

interface QuickLogFormProps {
  defaultValues: QuickLogFormValues
  defaultPlace: PlaceResult | null
  defaultPhoto?: string
  /** Editing something that already exists (shows the "mark complete" path). */
  existing?: { isDraft: boolean }
  saving: boolean
  onSubmit: (data: QuickLogSubmit) => void
}

/** Restaurant → rating → photo → note → save. Built to finish in well under 30 seconds. */
export function QuickLogForm({
  defaultValues,
  defaultPlace,
  defaultPhoto,
  existing,
  saving,
  onSubmit,
}: QuickLogFormProps) {
  const [place, setPlace] = useState<PlaceResult | null>(defaultPlace)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoRemoved, setPhotoRemoved] = useState(false)

  const form = useForm<QuickLogFormValues>({
    resolver: zodResolver(quickLogFormSchema),
    defaultValues,
  })
  const { register, control, handleSubmit, setValue, formState } = form

  const previewUrl = useMemo(
    () => (photoFile ? URL.createObjectURL(photoFile) : undefined),
    [photoFile],
  )
  useEffect(() => () => (previewUrl ? URL.revokeObjectURL(previewUrl) : undefined), [previewUrl])
  const shownPhoto = previewUrl ?? (photoRemoved ? undefined : defaultPhoto)

  const choosePlace = (next: PlaceResult | null) => {
    setPlace(next)
    setValue('placeId', next?.placeId ?? '', { shouldValidate: formState.isSubmitted })
  }

  const send = (complete: boolean) =>
    handleSubmit((values) => {
      if (!place) return
      onSubmit({
        place,
        values,
        photo: photoFile ?? (photoRemoved ? undefined : defaultPhoto),
        complete,
      })
    })
  // Enter / the main button keeps the current state; "Mark complete" finishes a draft.
  const submit = send(existing ? !existing.isDraft : false)
  const submitComplete = send(true)

  const finishLabel = !existing ? 'Save draft' : existing.isDraft ? 'Save draft' : 'Save changes'

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <input type="hidden" {...register('placeId')} />

      <RestaurantSearch
        value={place}
        onChange={choosePlace}
        error={formState.errors.placeId?.message}
      />

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">How was it?</span>
        <Controller
          control={control}
          name="familyRating"
          render={({ field }) => (
            <Rating label="How was it?" value={field.value} onChange={field.onChange} size={34} />
          )}
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">One photo</span>
        {shownPhoto ? (
          <div className="relative w-fit">
            <StoredImage
              src={shownPhoto}
              alt="Your photo of this meal"
              className="h-40 w-40 rounded-lg object-cover"
            />
            <button
              type="button"
              onClick={() => {
                setPhotoFile(null)
                setPhotoRemoved(true)
              }}
              aria-label="Remove photo"
              className="absolute -right-2 -top-2 flex h-touch w-touch items-center justify-center rounded-full bg-ink text-canvas shadow-card"
            >
              <Icon name="x" size={18} />
            </button>
          </div>
        ) : (
          <label className="flex min-h-touch w-fit cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed border-line px-4 py-3 font-medium text-ink hover:bg-surface-2 focus-within:ring-2 focus-within:ring-accent">
            <Icon name="camera" />
            Add a photo
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  setPhotoFile(file)
                  setPhotoRemoved(false)
                }
                e.target.value = ''
              }}
            />
          </label>
        )}
      </div>

      <TextArea
        label="Short note"
        placeholder="What stood out? What did the kids think?"
        maxLength={500}
        error={formState.errors.note?.message}
        {...register('note')}
      />

      <Input
        label="Date"
        type="date"
        error={formState.errors.date?.message}
        {...register('date')}
      />

      <div className="flex flex-wrap items-center gap-2">
        <AllergyBadges />
        <p className="text-xs text-ink-muted">{CONFIRM_PROMPT}</p>
      </div>

      <div
        className={cn(
          'flex flex-col gap-2 py-2 sm:flex-row',
          // Keep Save within thumb reach once a restaurant is chosen.
          place &&
            'sticky bottom-[calc(var(--bottom-nav-height)+0.5rem)] z-20 rounded-lg bg-canvas/90 backdrop-blur lg:static lg:bg-transparent',
        )}
      >
        <Button type="submit" size="lg" loading={saving} fullWidth>
          {finishLabel}
        </Button>
        {existing?.isDraft && (
          <Button
            size="lg"
            variant="secondary"
            loading={saving}
            fullWidth
            onClick={() => void submitComplete()}
          >
            Mark complete
          </Button>
        )}
      </div>
    </form>
  )
}
