import { useData } from '@/data/DataProvider'
import { useMembers, useSession, useSignInAs } from '@/hooks/queries'
import { cn } from '@/lib/cn'

/** Mock "login": pick which parent is using the app so we can see who logged what. */
export function UserSwitcher({ className }: { className?: string }) {
  const session = useSession()
  const members = useMembers()
  const signIn = useSignInAs()
  const { account } = useData()
  const parents = members.data?.filter((m) => m.isParent) ?? []
  // With real sign-in you are who you signed in as, so there is nothing to switch.
  if (account) {
    const me = members.data?.find((m) => m.id === session.data?.memberId)
    return me ? (
      <span
        className={cn(
          'inline-flex min-h-9 items-center rounded-full bg-surface-2 px-4 text-sm font-medium',
          className,
        )}
      >
        {me.name}
      </span>
    ) : null
  }

  if (parents.length === 0) return null

  return (
    <div
      role="radiogroup"
      aria-label="Who is using the app"
      className={cn('inline-flex rounded-full bg-surface-2 p-1', className)}
    >
      {parents.map((p) => {
        const active = session.data?.memberId === p.id
        return (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => signIn.mutate(p.id)}
            className={cn(
              'min-h-7 rounded-full px-4 text-sm font-medium transition-colors',
              active ? 'bg-accent text-accent-ink shadow-card' : 'text-ink-muted hover:text-ink',
            )}
          >
            {p.name}
          </button>
        )
      })}
    </div>
  )
}
