import type { ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { Button, Card, ErrorState, Input, ListSkeleton } from '@/components/ui'
import { useData } from '@/data/DataProvider'
import { AuthPage, RecoveryPage } from './AuthPage'
import { AuthShell as Shell } from './AuthShell'
import { ConnectionStatusPanel } from './ConnectionStatusPanel'
import { DEFAULT_FAMILY, DEFAULT_HOME } from '@/data/defaultFamily'
import {
  useAccountState,
  useClaimMember,
  useCreateHousehold,
  useJoinHousehold,
  useAccountActions,
  useSignOut,
} from '@/hooks/account'

const householdSchema = z.object({ name: z.string().trim().min(1, 'Give your household a name') })
const joinSchema = z.object({ code: z.string().trim().min(6, 'Enter the invite code') })

function NeedsHousehold({ email }: { email: string }) {
  const create = useCreateHousehold()
  const join = useJoinHousehold()
  const signOut = useSignOut()
  const createForm = useForm<z.infer<typeof householdSchema>>({
    resolver: zodResolver(householdSchema),
    defaultValues: { name: 'Our family' },
  })
  const joinForm = useForm<z.infer<typeof joinSchema>>({
    resolver: zodResolver(joinSchema),
    defaultValues: { code: '' },
  })

  return (
    <Shell title="Set up your household" subtitle={`Signed in as ${email}.`}>
      <Card className="flex flex-col gap-3">
        <h2 className="text-lg">Start a new journal</h2>
        <p className="text-sm text-ink-muted">
          Starts with {DEFAULT_FAMILY.map((m) => m.name).join(', ')}. You can change anyone in
          Profile.
        </p>
        <form
          noValidate
          className="flex flex-col gap-3"
          onSubmit={createForm.handleSubmit((v) =>
            create.mutate({ name: v.name, members: DEFAULT_FAMILY, ...DEFAULT_HOME }),
          )}
        >
          <Input
            label="Household name"
            error={createForm.formState.errors.name?.message}
            {...createForm.register('name')}
          />
          {create.error && (
            <p role="alert" className="text-sm text-danger">
              {create.error.message}
            </p>
          )}
          <Button type="submit" loading={create.isPending} fullWidth>
            Create our journal
          </Button>
        </form>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-lg">Join your partner</h2>
        <form
          noValidate
          className="flex flex-col gap-3"
          onSubmit={joinForm.handleSubmit((v) => join.mutate(v.code))}
        >
          <Input
            label="Invite code"
            autoCapitalize="none"
            autoComplete="off"
            error={joinForm.formState.errors.code?.message}
            {...joinForm.register('code')}
          />
          {join.error && (
            <p role="alert" className="text-sm text-danger">
              {join.error.message}
            </p>
          )}
          <Button type="submit" variant="secondary" loading={join.isPending} fullWidth>
            Join household
          </Button>
        </form>
      </Card>

      <Button variant="ghost" className="self-start" onClick={() => signOut.mutate()}>
        Sign out
      </Button>
    </Shell>
  )
}

function NeedsMember({ email, inviteCode }: { email: string; inviteCode: string | null }) {
  const { family } = useData()
  const claim = useClaimMember()
  const signOut = useSignOut()
  const members = useQuery({ queryKey: ['members', 'claim'], queryFn: () => family.listMembers() })
  const parents = members.data?.filter((m) => m.isParent) ?? []

  return (
    <Shell
      title="Which parent are you?"
      subtitle={`Signed in as ${email}. Your visits and ratings will be recorded under this name.`}
    >
      {members.isLoading ? (
        <ListSkeleton rows={2} />
      ) : members.isError ? (
        <ErrorState onRetry={() => void members.refetch()} />
      ) : (
        <ul className="flex flex-col gap-3">
          {parents.map((p) => (
            <li key={p.id}>
              <Button
                variant="secondary"
                size="lg"
                fullWidth
                loading={claim.isPending && claim.variables === p.id}
                onClick={() => claim.mutate(p.id)}
              >
                I&apos;m {p.name}
              </Button>
            </li>
          ))}
        </ul>
      )}
      {claim.error && (
        <p role="alert" className="text-sm text-danger">
          {claim.error.message}
        </p>
      )}
      {inviteCode && (
        <p className="text-sm text-ink-muted">
          Your partner can join with the invite code{' '}
          <strong className="font-medium text-ink">{inviteCode}</strong>.
        </p>
      )}
      <Button variant="ghost" className="self-start" onClick={() => signOut.mutate()}>
        Sign out
      </Button>
    </Shell>
  )
}

/** With real accounts, shows sign-in and setup screens until the person is ready; otherwise it does nothing. */
export function AuthGate({ children }: { children: ReactNode }) {
  const { account } = useData()
  const state = useAccountState()
  const actions = useAccountActions()
  if (!account || !actions) return <>{children}</>

  if (state.isLoading) {
    return (
      <Shell title="Loading…">
        <ListSkeleton rows={2} />
      </Shell>
    )
  }
  if (state.isError || !state.data) {
    return (
      <Shell title="Can't reach the server">
        <ErrorState
          message="Check your connection and your Supabase settings, then try again."
          onRetry={() => void state.refetch()}
        />
      </Shell>
    )
  }
  switch (state.data.status) {
    case 'signed-out':
      return <AuthPage actions={actions} footer={<ConnectionStatusPanel />} />
    case 'password-recovery':
      return <RecoveryPage email={state.data.email} actions={actions} />
    case 'needs-household':
      return <NeedsHousehold email={state.data.email} />
    case 'needs-member':
      return <NeedsMember email={state.data.email} inviteCode={state.data.inviteCode} />
    case 'ready':
      return <>{children}</>
  }
}
