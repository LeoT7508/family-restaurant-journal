import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Badge, BottomSheet, Button, Card, Checkbox, Icon, Input, useToast } from '@/components/ui'
import { useKidInfo, useSaveKidInfo } from '@/hooks/journal'
import { kidInfoFormSchema, type FamilyMember, type KidInfoFormValues, type Visit } from '@/types'
import { Section } from './Section'

const FLAGS: { key: keyof Omit<KidInfoFormValues, 'favoriteDishByChild'>; label: string }[] = [
  { key: 'kidsMenu', label: "Kids' menu" },
  { key: 'highChair', label: 'High chair' },
  { key: 'roomForStroller', label: 'Room for a stroller' },
  { key: 'quickService', label: 'Quick service' },
]

const EMPTY_KID_INFO: KidInfoFormValues = {
  kidsMenu: false,
  highChair: false,
  roomForStroller: false,
  quickService: false,
  favoriteDishByChild: {},
}

export function KidInfoForm({
  kids,
  defaultValues,
  saving,
  onSubmit,
  onCancel,
}: {
  kids: FamilyMember[]
  defaultValues: KidInfoFormValues
  saving: boolean
  onSubmit: (values: KidInfoFormValues) => void
  onCancel: () => void
}) {
  const { register, control, handleSubmit } = useForm<KidInfoFormValues>({
    resolver: zodResolver(kidInfoFormSchema),
    defaultValues,
  })
  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) =>
        onSubmit({
          ...values,
          // Drop empty favorites so they don't clutter the record.
          favoriteDishByChild: Object.fromEntries(
            Object.entries(values.favoriteDishByChild).filter(([, v]) => v.trim()),
          ),
        }),
      )}
      className="flex flex-col gap-4"
    >
      <div className="grid gap-2 sm:grid-cols-2">
        {FLAGS.map((f) => (
          <Checkbox key={f.key} label={f.label} {...register(f.key)} />
        ))}
      </div>
      {kids.map((kid) => (
        <Controller
          key={kid.id}
          control={control}
          name="favoriteDishByChild"
          render={({ field }) => (
            <Input
              label={`${kid.name}'s favorite dish here`}
              value={field.value[kid.id] ?? ''}
              onChange={(e) => field.onChange({ ...field.value, [kid.id]: e.target.value })}
            />
          )}
        />
      ))}
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

export function KidInfoSection({ visit, members }: { visit: Visit; members: FamilyMember[] }) {
  const kidInfo = useKidInfo()
  const save = useSaveKidInfo()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const kids = members.filter((m) => !m.isParent)
  const record = (kidInfo.data ?? []).find((k) => k.visitId === visit.id)
  const flags = FLAGS.filter((f) => record?.[f.key])
  const favorites = Object.entries(record?.favoriteDishByChild ?? {})
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? 'A child'

  return (
    <Section
      title="Kids"
      action={
        <Button variant="secondary" onClick={() => setOpen(true)}>
          <Icon name="pencil" size={18} /> {record ? 'Edit' : 'Add'}
        </Button>
      }
    >
      {!record || (flags.length === 0 && favorites.length === 0) ? (
        <p className="rounded-md bg-surface-2 p-4 text-ink-muted">
          No kid notes yet: kids&apos; menu, high chair, stroller space and favorites.
        </p>
      ) : (
        <Card className="flex flex-col gap-3">
          {flags.length > 0 && (
            <ul className="flex flex-wrap gap-1.5" aria-label="Kid-friendly features">
              {flags.map((f) => (
                <li key={f.key}>
                  <Badge tone="sage" icon="check">
                    {f.label}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
          {favorites.length > 0 && (
            <ul className="flex flex-col gap-1">
              {favorites.map(([id, dish]) => (
                <li key={id}>
                  <span className="font-medium">{nameOf(id)}&apos;s favorite:</span> {dish}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
      <BottomSheet open={open} onClose={() => setOpen(false)} title="Kid info">
        <KidInfoForm
          kids={kids}
          defaultValues={
            record
              ? {
                  kidsMenu: record.kidsMenu,
                  highChair: record.highChair,
                  roomForStroller: record.roomForStroller,
                  quickService: record.quickService,
                  favoriteDishByChild: record.favoriteDishByChild,
                }
              : EMPTY_KID_INFO
          }
          saving={save.isPending}
          onCancel={() => setOpen(false)}
          onSubmit={(values) =>
            save.mutate(
              {
                id: record?.id,
                values: { ...values, restaurantId: visit.restaurantId, visitId: visit.id },
              },
              {
                onSuccess: () => {
                  toast.show('Kid info saved.')
                  setOpen(false)
                },
                onError: (e) => toast.show(e.message, 'error'),
              },
            )
          }
        />
      </BottomSheet>
    </Section>
  )
}
