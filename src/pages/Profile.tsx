import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { PageHeader } from '@/components/features/PageHeader'
import { FamilyMemberForm } from '@/components/features/FamilyMemberForm'
import { UserSwitcher } from '@/components/features/UserSwitcher'
import {
  Badge,
  BottomSheet,
  Button,
  Card,
  ErrorState,
  Icon,
  Input,
  ListSkeleton,
  Tabs,
  useToast,
} from '@/components/ui'
import { useData } from '@/data/DataProvider'
import { ConnectionStatusPanel } from '@/components/features/ConnectionStatusPanel'
import { useAccountState, useSignOut } from '@/hooks/account'
import {
  useHousehold,
  useMembers,
  useRemoveMember,
  useSaveMember,
  useUpdateHousehold,
} from '@/hooks/queries'
import { useLoadSnapshot, usePendingSync } from '@/hooks/actions'
import { buildBackup, downloadText, visitsToCsv } from '@/lib/export'
import { numberOrUndefined } from '@/lib/forms'
import { todayISO } from '@/lib/format'
import { useTheme, type ThemeSetting } from '@/hooks/useTheme'
import { CONFIRM_PROMPT, NOTES_DISCLAIMER } from '@/lib/allergy'
import {
  homeFormSchema,
  type FamilyMember,
  type FamilyMemberFormValues,
  type HomeFormValues,
} from '@/types'

const THEME_ITEMS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'Auto' },
] as const

function HomeForm({
  defaultValues,
  saving,
  onSubmit,
  onCancel,
}: {
  defaultValues: HomeFormValues
  saving: boolean
  onSubmit: (values: HomeFormValues) => void
  onCancel: () => void
}) {
  const { register, handleSubmit, formState } = useForm<HomeFormValues>({
    resolver: zodResolver(homeFormSchema),
    defaultValues,
  })
  const { errors } = formState
  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Input
        label="Place name"
        error={errors.homeLabel?.message}
        data-autofocus
        {...register('homeLabel')}
      />
      <Input
        label="ZIP code"
        inputMode="numeric"
        maxLength={5}
        error={errors.homeZip?.message}
        {...register('homeZip')}
      />
      <Input
        label="Drive-time radius (minutes)"
        type="number"
        inputMode="numeric"
        min={5}
        max={120}
        hint="Used as the default for Where tonight? and Home ideas."
        error={errors.driveRadiusMinutes?.message}
        {...register('driveRadiusMinutes', { setValueAs: numberOrUndefined })}
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

export default function Profile() {
  const members = useMembers()
  const household = useHousehold()
  const save = useSaveMember()
  const remove = useRemoveMember()
  const toast = useToast()
  const { setting, setTheme } = useTheme()
  const { devTools, account, backend } = useData()
  const accountState = useAccountState()
  const signOut = useSignOut()
  const updateHousehold = useUpdateHousehold()
  const loadSnapshot = useLoadSnapshot()
  const pending = usePendingSync()
  const [editingHome, setEditingHome] = useState(false)
  const [destination, setDestination] = useState('')
  const [exporting, setExporting] = useState(false)

  const [editing, setEditing] = useState<FamilyMember | 'new' | null>(null)
  const [confirmingRemove, setConfirmingRemove] = useState(false)

  const close = () => {
    setEditing(null)
    setConfirmingRemove(false)
  }

  const onSave = (values: FamilyMemberFormValues) => {
    const editingId = editing && editing !== 'new' ? editing.id : undefined
    save.mutate(
      {
        id: editingId,
        values: {
          name: values.name,
          role: values.role,
          age: values.role === 'child' ? values.age : undefined,
          allergies: values.allergies,
          isParent: values.role === 'parent',
        },
      },
      {
        onSuccess: () => {
          toast.show(editingId ? 'Profile updated.' : 'Family member added.')
          close()
        },
        onError: (e) => toast.show(e.message, 'error'),
      },
    )
  }

  const onRemove = () => {
    if (!editing || editing === 'new') return
    remove.mutate(editing.id, {
      onSuccess: () => {
        toast.show(`${editing.name} removed.`)
        close()
      },
      onError: (e) => toast.show(e.message, 'error'),
    })
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <PageHeader
        title="Profile"
        subtitle="Who's logging, how it looks, and who's in the family."
      />

      <section aria-labelledby="who" className="flex flex-col gap-3">
        <h2 id="who" className="text-xl">
          {account ? 'Your account' : "Who's logging?"}
        </h2>
        {account ? (
          <>
            <p className="text-ink-muted">
              Signed in
              {accountState.data && 'email' in accountState.data
                ? ` as ${accountState.data.email}`
                : ''}
              . Every visit you log is recorded under your name.
            </p>
            <UserSwitcher className="w-fit" />
            {accountState.data &&
              'inviteCode' in accountState.data &&
              accountState.data.inviteCode && (
                <Card className="flex flex-col gap-1">
                  <p className="text-sm text-ink-muted">Invite code for your partner</p>
                  <p className="font-mono text-lg font-medium tracking-wide">
                    {accountState.data.inviteCode}
                  </p>
                  <p className="text-sm text-ink-muted">
                    They create an account, choose &ldquo;Join your partner&rdquo; and enter this
                    code.
                  </p>
                </Card>
              )}
            <Button
              variant="secondary"
              className="self-start"
              loading={signOut.isPending}
              onClick={() => signOut.mutate()}
            >
              Sign out
            </Button>
          </>
        ) : (
          <>
            <p className="text-ink-muted">
              This is a stand-in for sign-in. It just records who logged each visit.
            </p>
            <UserSwitcher className="w-fit" />
          </>
        )}
        <p className="text-sm text-ink-muted">
          {backend === 'supabase'
            ? 'Your journal is saved securely online and shared between you and your partner.'
            : 'Using sample data saved only in this browser. Add your Supabase keys to .env.local to save online (see the README).'}
        </p>
      </section>

      {backend === 'supabase' && <ConnectionStatusPanel />}

      <section aria-labelledby="look" className="flex flex-col gap-3">
        <h2 id="look" className="text-xl">
          Appearance
        </h2>
        <Tabs
          label="Theme"
          items={THEME_ITEMS.map((t) => ({ ...t }))}
          value={setting}
          onChange={(v) => setTheme(v as ThemeSetting)}
          className="max-w-sm"
        />
      </section>

      <section aria-labelledby="family" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="family" className="text-xl">
            Family
          </h2>
          <Button variant="secondary" onClick={() => setEditing('new')}>
            <Icon name="plus" size={18} /> Add
          </Button>
        </div>
        {members.isLoading ? (
          <ListSkeleton rows={4} />
        ) : members.isError ? (
          <ErrorState onRetry={() => void members.refetch()} />
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {members.data?.map((m) => (
              <li key={m.id}>
                <Card className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-soft text-lg font-semibold text-accent"
                  >
                    {m.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{m.name}</p>
                    <p className="text-sm text-ink-muted">
                      {m.isParent
                        ? 'Parent'
                        : `Child${m.age !== undefined ? `, age ${m.age}` : ''}`}
                    </p>
                    {m.allergies.length > 0 && (
                      <Badge tone="calm" icon="info" className="mt-1">
                        Allergy: {m.allergies.join(', ')}
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => setEditing(m)}
                    aria-label={`Edit ${m.name}`}
                  >
                    <Icon name="pencil" size={20} />
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        )}
        <p className="text-sm text-ink-muted">
          {NOTES_DISCLAIMER} {CONFIRM_PROMPT}
        </p>
      </section>

      <section aria-labelledby="home" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="home" className="text-xl">
            Home base
          </h2>
          <Button
            variant="secondary"
            onClick={() => setEditingHome(true)}
            disabled={!household.data}
          >
            <Icon name="pencil" size={18} /> Edit
          </Button>
        </div>
        {household.isLoading ? (
          <ListSkeleton rows={1} />
        ) : household.data ? (
          <Card>
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <dt className="text-sm text-ink-muted">Location</dt>
                <dd className="font-medium">{household.data.homeLabel}</dd>
              </div>
              <div>
                <dt className="text-sm text-ink-muted">ZIP</dt>
                <dd className="font-medium">{household.data.homeZip}</dd>
              </div>
              <div>
                <dt className="text-sm text-ink-muted">Drive-time radius</dt>
                <dd className="font-medium">{household.data.driveRadiusMinutes} minutes</dd>
              </div>
            </dl>
          </Card>
        ) : null}
      </section>

      <section id="travel" aria-labelledby="travel-h" className="flex flex-col gap-3">
        <h2 id="travel-h" className="text-xl">
          Travel mode
        </h2>
        {household.data?.travel ? (
          <Card className="flex flex-col gap-3">
            <p>
              You&apos;re travelling in{' '}
              <strong className="font-medium">{household.data.travel.destination}</strong>. Places
              you add are saved as part of this trip, and Where tonight? only suggests places from
              it.
            </p>
            <Button
              variant="secondary"
              className="self-start"
              loading={updateHousehold.isPending}
              onClick={() =>
                updateHousehold.mutate(
                  { travel: undefined },
                  { onSuccess: () => toast.show('Welcome home. Travel mode is off.') },
                )
              }
            >
              Back home
            </Button>
          </Card>
        ) : (
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              const trimmed = destination.trim()
              if (!trimmed) return
              updateHousehold.mutate(
                { travel: { destination: trimmed } },
                {
                  onSuccess: () => {
                    toast.show(`Travel mode on for ${trimmed}.`)
                    setDestination('')
                  },
                  onError: (err) => toast.show(err.message, 'error'),
                },
              )
            }}
          >
            <p className="text-ink-muted">
              Away from home? Turn this on so drive times from home don&apos;t get in the way.
            </p>
            <Input
              label="Where are you going?"
              placeholder="e.g. Orlando, FL"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            />
            <Button
              type="submit"
              variant="secondary"
              className="self-start"
              disabled={!destination.trim()}
            >
              Start travel mode
            </Button>
          </form>
        )}
      </section>

      <section aria-labelledby="more" className="flex flex-col gap-3">
        <h2 id="more" className="text-xl">
          Your year
        </h2>
        <Link
          to="/year"
          className="flex min-h-touch items-center justify-between gap-3 rounded-lg border border-line bg-surface p-4 shadow-card hover:shadow-raised"
        >
          <span className="flex items-center gap-3 font-medium">
            <Icon name="chart" /> Year in review
          </span>
          <Icon name="chevron" />
        </Link>
      </section>

      <section aria-labelledby="export" className="flex flex-col gap-3">
        <h2 id="export" className="text-xl">
          Export
        </h2>
        <p className="text-ink-muted">
          The spreadsheet has one row per visit and leaves out notes and allergy details. The full
          backup includes everything, including allergy notes and family profiles, so keep it
          private.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            loading={exporting}
            onClick={async () => {
              setExporting(true)
              try {
                downloadText(
                  `table-journal-visits-${todayISO()}.csv`,
                  visitsToCsv(await loadSnapshot()),
                  'text/csv',
                )
                toast.show('Spreadsheet downloaded.')
              } catch (err) {
                toast.show(err instanceof Error ? err.message : 'Export failed.', 'error')
              } finally {
                setExporting(false)
              }
            }}
          >
            <Icon name="download" size={18} /> Spreadsheet (CSV)
          </Button>
          <Button
            variant="secondary"
            loading={exporting}
            onClick={async () => {
              setExporting(true)
              try {
                downloadText(
                  `table-journal-backup-${todayISO()}.json`,
                  JSON.stringify(buildBackup(await loadSnapshot()), null, 2),
                  'application/json',
                )
                toast.show('Backup downloaded.')
              } catch (err) {
                toast.show(err instanceof Error ? err.message : 'Export failed.', 'error')
              } finally {
                setExporting(false)
              }
            }}
          >
            <Icon name="download" size={18} /> Full backup (JSON)
          </Button>
        </div>
      </section>

      <section aria-labelledby="sync" className="flex flex-col gap-2">
        <h2 id="sync" className="text-xl">
          Saved on this device
        </h2>
        <p className="text-ink-muted">
          {pending.data === undefined
            ? 'Checking…'
            : pending.data === 0
              ? 'Everything is in sync.'
              : `${pending.data} ${pending.data === 1 ? 'record is' : 'records are'} saved only on this device. Syncing to a server isn't connected yet, so export a backup now and then.`}
        </p>
      </section>

      {devTools && (
        <section aria-labelledby="dev" className="flex flex-col gap-3">
          <h2 id="dev" className="text-xl">
            Sample data
          </h2>
          <p className="text-ink-muted">
            Stored only in this browser. Reset to explore the sample journal, or clear it to see the
            first-run experience.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => void devTools.resetToSeed()}>
              Restore sample data
            </Button>
            <Button variant="secondary" onClick={() => void devTools.resetToEmpty()}>
              Start with an empty journal
            </Button>
          </div>
        </section>
      )}

      <BottomSheet open={editingHome} onClose={() => setEditingHome(false)} title="Home base">
        {household.data && (
          <HomeForm
            defaultValues={{
              homeLabel: household.data.homeLabel,
              homeZip: household.data.homeZip,
              driveRadiusMinutes: household.data.driveRadiusMinutes,
            }}
            saving={updateHousehold.isPending}
            onCancel={() => setEditingHome(false)}
            onSubmit={(values) =>
              updateHousehold.mutate(values, {
                onSuccess: () => {
                  toast.show('Home base updated.')
                  setEditingHome(false)
                },
                onError: (err) => toast.show(err.message, 'error'),
              })
            }
          />
        )}
      </BottomSheet>

      <BottomSheet
        open={editing !== null}
        onClose={close}
        title={editing === 'new' ? 'Add family member' : `Edit ${editing?.name ?? ''}`}
      >
        {editing && (
          <>
            <FamilyMemberForm
              key={editing === 'new' ? 'new' : editing.id}
              defaultValues={
                editing === 'new'
                  ? undefined
                  : {
                      name: editing.name,
                      role: editing.role,
                      age: editing.age,
                      allergies: editing.allergies,
                    }
              }
              saving={save.isPending}
              onSubmit={onSave}
              onCancel={close}
            />
            {editing !== 'new' && !editing.isParent && (
              <div className="mt-4 border-t border-line pt-4">
                {confirmingRemove ? (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="danger"
                      onClick={onRemove}
                      loading={remove.isPending}
                      fullWidth
                    >
                      Yes, remove {editing.name}
                    </Button>
                    <Button variant="ghost" onClick={() => setConfirmingRemove(false)} fullWidth>
                      Keep
                    </Button>
                  </div>
                ) : (
                  <Button variant="ghost" onClick={() => setConfirmingRemove(true)}>
                    <Icon name="trash" size={18} /> Remove from family
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </BottomSheet>
    </div>
  )
}
