import { useState } from 'react'
import { StoredImage } from './StoredImage'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Badge,
  BottomSheet,
  Button,
  Card,
  Chip,
  EmptyState,
  Icon,
  Input,
  Segmented,
  useToast,
} from '@/components/ui'
import { useDeleteDish, useDishes, useSaveDish } from '@/hooks/journal'
import { dishStatusLabel, membersWithAllergies } from '@/lib/allergy'
import {
  dishFormSchema,
  type DishEntry,
  type DishFormValues,
  type FamilyMember,
  type AllergyStatus,
  type Verdict,
  type Visit,
} from '@/types'
import { PhotoField } from './PhotoField'
import { Section } from './Section'

const VERDICTS: { value: Verdict; label: string }[] = [
  { value: 'loved', label: 'Loved it' },
  { value: 'okay', label: 'Okay' },
  { value: 'skip', label: 'Skip' },
]

interface DishFormProps {
  members: FamilyMember[]
  defaultValues: DishFormValues
  saving?: boolean
  onSubmit: (values: DishFormValues) => void
  onCancel: () => void
  onDelete?: () => void
  deleting?: boolean
}

function DishForm({
  members,
  defaultValues,
  saving,
  onSubmit,
  onCancel,
  onDelete,
  deleting,
}: DishFormProps) {
  const { register, control, handleSubmit, formState } = useForm<DishFormValues>({
    resolver: zodResolver(dishFormSchema),
    defaultValues,
  })
  const eatenBy = useWatch({ control, name: 'eatenBy' })
  const [confirmDelete, setConfirmDelete] = useState(false)
  const allergic = membersWithAllergies(members)[0]

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) =>
        onSubmit({
          ...values,
          // Keep a verdict only for people who ate it, defaulting to "okay".
          verdicts: Object.fromEntries(
            values.eatenBy.map((id) => [id, values.verdicts[id] ?? 'okay']),
          ),
        }),
      )}
      className="flex flex-col gap-5"
    >
      <Input
        label="Dish"
        error={formState.errors.name?.message}
        data-autofocus
        {...register('name')}
      />

      <Controller
        control={control}
        name="eatenBy"
        render={({ field }) => (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">Who ate it?</legend>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => {
                const selected = field.value.includes(m.id)
                return (
                  <Chip
                    key={m.id}
                    selected={selected}
                    onClick={() =>
                      field.onChange(
                        selected ? field.value.filter((id) => id !== m.id) : [...field.value, m.id],
                      )
                    }
                  >
                    {m.name}
                  </Chip>
                )
              })}
            </div>
          </fieldset>
        )}
      />

      {eatenBy.length > 0 && (
        <Controller
          control={control}
          name="verdicts"
          render={({ field }) => (
            <div className="flex flex-col gap-3">
              {members
                .filter((m) => eatenBy.includes(m.id))
                .map((m) => (
                  <div key={m.id} className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium">{m.name}&apos;s verdict</span>
                    <Segmented
                      label={`${m.name}'s verdict`}
                      options={VERDICTS}
                      value={field.value[m.id] ?? 'okay'}
                      onChange={(v) => field.onChange({ ...field.value, [m.id]: v })}
                    />
                  </div>
                ))}
            </div>
          )}
        />
      )}

      {allergic && (
        <Controller
          control={control}
          name="safeForAllergy"
          render={({ field }) => (
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">How did it go for {allergic.name}?</span>
              <Segmented<AllergyStatus>
                label={`How did it go for ${allergic.name}`}
                options={[
                  { value: 'safe', label: 'Ate it fine' },
                  { value: 'unknown', label: 'Not sure' },
                  { value: 'avoid', label: 'Skip it' },
                ]}
                value={field.value}
                onChange={field.onChange}
              />
              <p className="text-xs text-ink-muted">
                Your own note only. Always confirm with the restaurant again.
              </p>
            </div>
          )}
        />
      )}

      <Controller
        control={control}
        name="photo"
        render={({ field }) => (
          <PhotoField label="Dish photo" value={field.value} onChange={field.onChange} />
        )}
      />

      <div className="flex gap-2">
        <Button type="submit" loading={saving} fullWidth>
          Save dish
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
                Yes, delete this dish
              </Button>
              <Button variant="ghost" onClick={() => setConfirmDelete(false)} fullWidth>
                Keep
              </Button>
            </div>
          ) : (
            <Button variant="ghost" onClick={() => setConfirmDelete(true)}>
              <Icon name="trash" size={18} /> Delete dish
            </Button>
          )}
        </div>
      )}
    </form>
  )
}

const toForm = (d: DishEntry): DishFormValues => ({
  name: d.name,
  eatenBy: d.eatenBy,
  verdicts: d.verdicts,
  safeForAllergy: d.safeForAllergy,
  photo: d.photo,
})

export function DishesSection({ visit, members }: { visit: Visit; members: FamilyMember[] }) {
  const dishes = useDishes()
  const save = useSaveDish()
  const remove = useDeleteDish()
  const toast = useToast()
  const [editing, setEditing] = useState<DishEntry | 'new' | null>(null)
  const allergic = membersWithAllergies(members)[0]
  const mine = (dishes.data ?? []).filter((d) => d.visitId === visit.id)
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? 'Someone'

  const close = () => setEditing(null)

  const onSubmit = (values: DishFormValues) => {
    const id = editing && editing !== 'new' ? editing.id : undefined
    save.mutate(
      { id, values: { ...values, visitId: visit.id } },
      {
        onSuccess: () => {
          toast.show(id ? 'Dish updated.' : 'Dish added.')
          close()
        },
        onError: (e) => toast.show(e.message, 'error'),
      },
    )
  }

  const defaults: DishFormValues =
    editing && editing !== 'new'
      ? toForm(editing)
      : { name: '', eatenBy: [], verdicts: {}, safeForAllergy: 'unknown' }

  return (
    <Section
      title="Dishes"
      action={
        <Button variant="secondary" onClick={() => setEditing('new')}>
          <Icon name="plus" size={18} /> Add dish
        </Button>
      }
    >
      {mine.length === 0 ? (
        <EmptyState
          icon="sparkle"
          title="What did everyone eat?"
          description="Add the dishes and who loved them."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {mine.map((d) => (
            <li key={d.id}>
              <Card className="flex gap-3">
                {d.photo && (
                  <StoredImage src={d.photo} alt="" className="h-16 w-16 rounded-md object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{d.name}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {d.eatenBy.map((id) => (
                      <Badge
                        key={id}
                        tone={d.verdicts[id] === 'loved' ? 'sage' : 'neutral'}
                        icon={d.verdicts[id] === 'loved' ? 'heart' : undefined}
                      >
                        {nameOf(id)}: {d.verdicts[id] ?? 'okay'}
                      </Badge>
                    ))}
                    {allergic && d.safeForAllergy !== 'unknown' && (
                      <Badge tone="calm" icon="info">
                        {dishStatusLabel(d.safeForAllergy, allergic.name)}
                      </Badge>
                    )}
                  </div>
                </div>
                <Button variant="ghost" onClick={() => setEditing(d)} aria-label={`Edit ${d.name}`}>
                  <Icon name="pencil" size={20} />
                </Button>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <BottomSheet
        open={editing !== null}
        onClose={close}
        title={editing === 'new' ? 'Add a dish' : 'Edit dish'}
      >
        {editing && (
          <DishForm
            key={editing === 'new' ? 'new' : editing.id}
            members={members}
            defaultValues={defaults}
            saving={save.isPending}
            onSubmit={onSubmit}
            onCancel={close}
            deleting={remove.isPending}
            onDelete={
              editing !== 'new'
                ? () =>
                    remove.mutate(editing.id, {
                      onSuccess: () => {
                        toast.show('Dish deleted.')
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
