import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Badge,
  BottomSheet,
  Button,
  Card,
  Icon,
  Input,
  Select,
  TextArea,
  useToast,
} from '@/components/ui'
import { useAllergyNotes, useDeleteAllergyNote, useSaveAllergyNote } from '@/hooks/journal'
import { CONFIRM_PROMPT, NOTES_DISCLAIMER, membersWithAllergies } from '@/lib/allergy'
import { formatDate, timeAgo, todayISO } from '@/lib/format'
import {
  allergyNoteFormSchema,
  type AllergyNote,
  type AllergyNoteFormValues,
  type FamilyMember,
} from '@/types'
import { Section } from './Section'

function AllergyNoteForm({
  members,
  defaultValues,
  saving,
  deleting,
  onSubmit,
  onCancel,
  onDelete,
}: {
  members: FamilyMember[]
  defaultValues: AllergyNoteFormValues
  saving: boolean
  deleting: boolean
  onSubmit: (values: AllergyNoteFormValues) => void
  onCancel: () => void
  onDelete?: () => void
}) {
  const { register, handleSubmit, formState } = useForm<AllergyNoteFormValues>({
    resolver: zodResolver(allergyNoteFormSchema),
    defaultValues,
  })
  const { errors } = formState
  const [confirmDelete, setConfirmDelete] = useState(false)
  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Select label="About" error={errors.memberId?.message} {...register('memberId')}>
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
            {m.allergies.length ? ` (${m.allergies.join(', ')})` : ''}
          </option>
        ))}
      </Select>
      <TextArea
        label="What did they say?"
        hint="Write what you asked and what you were told, in your own words."
        error={errors.note?.message}
        data-autofocus
        {...register('note')}
      />
      <Input label="Who did you ask?" error={errors.askedWho?.message} {...register('askedWho')} />
      <Input
        label="Date asked"
        type="date"
        error={errors.dateAsked?.message}
        {...register('dateAsked')}
      />
      <p className="text-sm text-ink-muted">
        {NOTES_DISCLAIMER} {CONFIRM_PROMPT}
      </p>
      <div className="flex gap-2">
        <Button type="submit" loading={saving} fullWidth>
          Save note
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
                Yes, delete this note
              </Button>
              <Button variant="ghost" onClick={() => setConfirmDelete(false)} fullWidth>
                Keep
              </Button>
            </div>
          ) : (
            <Button variant="ghost" onClick={() => setConfirmDelete(true)}>
              <Icon name="trash" size={18} /> Delete note
            </Button>
          )}
        </div>
      )}
    </form>
  )
}

/** The family's own dated notes about a restaurant. Never a safety claim. */
export function AllergyNotes({
  restaurantId,
  members,
  readOnly,
}: {
  restaurantId: string
  members: FamilyMember[]
  readOnly?: boolean
}) {
  const notes = useAllergyNotes()
  const save = useSaveAllergyNote()
  const remove = useDeleteAllergyNote()
  const toast = useToast()
  const [editing, setEditing] = useState<AllergyNote | 'new' | null>(null)

  const aboutOptions = membersWithAllergies(members).length
    ? membersWithAllergies(members)
    : members
  const mine = (notes.data ?? [])
    .filter((n) => n.restaurantId === restaurantId)
    .sort((a, b) => b.dateAsked.localeCompare(a.dateAsked))
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? 'Someone'
  const close = () => setEditing(null)

  const defaults: AllergyNoteFormValues =
    editing && editing !== 'new'
      ? {
          memberId: editing.memberId,
          note: editing.note,
          askedWho: editing.askedWho,
          dateAsked: editing.dateAsked,
        }
      : { memberId: aboutOptions[0]?.id ?? '', note: '', askedWho: '', dateAsked: todayISO() }

  return (
    <Section
      title="Allergy notes"
      hint={`${NOTES_DISCLAIMER} ${CONFIRM_PROMPT}`}
      action={
        readOnly ? undefined : (
          <Button variant="secondary" onClick={() => setEditing('new')}>
            <Icon name="plus" size={18} /> Add note
          </Button>
        )
      }
    >
      {mine.length === 0 ? (
        <p className="rounded-md bg-surface-2 p-4 text-ink-muted">
          No notes yet. When you ask about an allergy, write down what you were told.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {mine.map((n) => (
            <li key={n.id}>
              <Card className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone="calm" icon="info">
                      {nameOf(n.memberId)}
                    </Badge>
                    <span className="text-sm font-medium">
                      {formatDate(n.dateAsked)} · {timeAgo(n.dateAsked)}
                    </span>
                  </div>
                  <p className="mt-1.5">{n.note}</p>
                  <p className="mt-1 text-sm text-ink-muted">Asked: {n.askedWho}</p>
                  <p className="mt-1 text-sm font-medium">{CONFIRM_PROMPT}</p>
                </div>
                {!readOnly && (
                  <Button
                    variant="ghost"
                    onClick={() => setEditing(n)}
                    aria-label="Edit allergy note"
                  >
                    <Icon name="pencil" size={20} />
                  </Button>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
      <BottomSheet
        open={editing !== null}
        onClose={close}
        title={editing === 'new' ? 'Add an allergy note' : 'Edit allergy note'}
      >
        {editing && (
          <AllergyNoteForm
            key={editing === 'new' ? 'new' : editing.id}
            members={aboutOptions}
            defaultValues={defaults}
            saving={save.isPending}
            deleting={remove.isPending}
            onCancel={close}
            onSubmit={(values) => {
              const id = editing !== 'new' ? editing.id : undefined
              save.mutate(
                { id, values: { ...values, restaurantId } },
                {
                  onSuccess: () => {
                    toast.show('Note saved.')
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
                        toast.show('Note deleted.')
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
