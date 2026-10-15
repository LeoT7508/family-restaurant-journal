import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { BottomSheet, Button, Card, Icon, Input, useToast } from '@/components/ui'
import { useUpdateVisit } from '@/hooks/journal'
import { numberOrUndefined } from '@/lib/forms'
import { formatMoney, perPerson } from '@/lib/format'
import { costsFormSchema, type CostsFormValues, type Visit } from '@/types'
import { Section } from './Section'

function CostsForm({
  defaultValues,
  saving,
  onSubmit,
  onCancel,
}: {
  defaultValues: CostsFormValues
  saving: boolean
  onSubmit: (values: CostsFormValues) => void
  onCancel: () => void
}) {
  const { register, control, handleSubmit, formState } = useForm<CostsFormValues>({
    resolver: zodResolver(costsFormSchema),
    defaultValues,
  })
  const total = useWatch({ control, name: 'amountSpent' })
  const size = useWatch({ control, name: 'partySize' })
  const each = perPerson(total, size)
  const { errors } = formState
  const num = { setValueAs: numberOrUndefined }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Input
        label="Total spent ($)"
        type="number"
        inputMode="decimal"
        step="0.01"
        min={0}
        error={errors.amountSpent?.message}
        data-autofocus
        {...register('amountSpent', num)}
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Subtotal ($)"
          type="number"
          inputMode="decimal"
          step="0.01"
          min={0}
          hint="Optional"
          error={errors.subtotal?.message}
          {...register('subtotal', num)}
        />
        <Input
          label="Tip ($)"
          type="number"
          inputMode="decimal"
          step="0.01"
          min={0}
          hint="Optional"
          error={errors.tip?.message}
          {...register('tip', num)}
        />
      </div>
      <Input
        label="People at the table"
        type="number"
        inputMode="numeric"
        min={1}
        error={errors.partySize?.message}
        {...register('partySize', num)}
      />
      {each !== null && (
        <p className="rounded-md bg-surface-2 p-3 font-medium">
          About {formatMoney(each)} per person
        </p>
      )}
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

export function CostsSection({ visit }: { visit: Visit }) {
  const update = useUpdateVisit()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const each = perPerson(visit.amountSpent, visit.partySize)
  const rows: [string, string | undefined][] = [
    ['Total', visit.amountSpent !== undefined ? formatMoney(visit.amountSpent) : undefined],
    ['Subtotal', visit.subtotal !== undefined ? formatMoney(visit.subtotal) : undefined],
    ['Tip', visit.tip !== undefined ? formatMoney(visit.tip) : undefined],
    ['People', visit.partySize !== undefined ? String(visit.partySize) : undefined],
    ['Per person', each !== null ? formatMoney(each) : undefined],
  ]
  const shown = rows.filter(([, v]) => v !== undefined)

  return (
    <Section
      title="Price"
      action={
        <Button variant="secondary" onClick={() => setOpen(true)}>
          <Icon name="pencil" size={18} /> {shown.length ? 'Edit' : 'Add'}
        </Button>
      }
    >
      {shown.length === 0 ? (
        <p className="rounded-md bg-surface-2 p-4 text-ink-muted">No price added yet.</p>
      ) : (
        <Card>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {shown.map(([label, value]) => (
              <div key={label}>
                <dt className="text-sm text-ink-muted">{label}</dt>
                <dd className="font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      )}
      <BottomSheet open={open} onClose={() => setOpen(false)} title="Price">
        <CostsForm
          defaultValues={{
            amountSpent: visit.amountSpent,
            subtotal: visit.subtotal,
            tip: visit.tip,
            partySize: visit.partySize,
          }}
          saving={update.isPending}
          onCancel={() => setOpen(false)}
          onSubmit={(values) =>
            update.mutate(
              { id: visit.id, patch: values },
              {
                onSuccess: () => {
                  toast.show('Price saved.')
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
