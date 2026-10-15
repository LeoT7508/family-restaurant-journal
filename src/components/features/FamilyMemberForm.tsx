import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Chip, Input, Select } from '@/components/ui'
import { familyMemberFormSchema, type FamilyMemberFormValues } from '@/types'

interface FamilyMemberFormProps {
  defaultValues?: FamilyMemberFormValues
  saving?: boolean
  onSubmit: (values: FamilyMemberFormValues) => void
  onCancel: () => void
}

const EMPTY: FamilyMemberFormValues = { name: '', role: 'child', age: undefined, allergies: [] }

function AllergyEditor({
  value,
  onChange,
}: {
  value: string[]
  onChange: (next: string[]) => void
}) {
  const [draft, setDraft] = useState('')
  const add = () => {
    const item = draft.trim().toLowerCase()
    if (item && !value.includes(item)) onChange([...value, item])
    setDraft('')
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Input
            label="Allergies"
            hint="Your own notes. They never appear on share cards."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                add()
              }
            }}
            placeholder="e.g. egg"
          />
        </div>
        <Button variant="secondary" onClick={add} disabled={!draft.trim()}>
          Add
        </Button>
      </div>
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Allergies added">
          {value.map((a) => (
            <li key={a}>
              <Chip onRemove={() => onChange(value.filter((x) => x !== a))}>{a}</Chip>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function FamilyMemberForm({
  defaultValues = EMPTY,
  saving,
  onSubmit,
  onCancel,
}: FamilyMemberFormProps) {
  const { register, control, handleSubmit, formState } = useForm<FamilyMemberFormValues>({
    resolver: zodResolver(familyMemberFormSchema),
    defaultValues,
  })
  const role = useWatch({ control, name: 'role' })
  const { errors } = formState

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <Input label="Name" error={errors.name?.message} data-autofocus {...register('name')} />
      <Select label="Role" {...register('role')}>
        <option value="parent">Parent</option>
        <option value="child">Child</option>
      </Select>
      {role === 'child' && (
        <Input
          label="Age"
          type="number"
          inputMode="numeric"
          min={0}
          max={25}
          error={errors.age?.message}
          {...register('age', {
            setValueAs: (v) => (v === '' || v == null ? undefined : Number(v)),
          })}
        />
      )}
      <Controller
        control={control}
        name="allergies"
        render={({ field }) => <AllergyEditor value={field.value} onChange={field.onChange} />}
      />
      <div className="flex gap-2 pt-2">
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
