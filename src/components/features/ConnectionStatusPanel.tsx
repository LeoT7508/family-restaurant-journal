import { useQuery } from '@tanstack/react-query'
import { Button, Card, Icon } from '@/components/ui'
import { useData } from '@/data/DataProvider'
import type { ConnectionStatus } from '@/data/repositories'
import { cn } from '@/lib/cn'

interface Check {
  label: string
  ok: boolean
  /** What to do when it isn't ok. */
  fix: string
}

function checksFor(host: string, s: ConnectionStatus): Check[] {
  return [
    {
      label: `Reached ${host}`,
      ok: s.reachable,
      fix: 'Check VITE_SUPABASE_URL in .env.local and your internet connection.',
    },
    {
      label: 'Project accepted the key',
      ok: s.keyAccepted,
      fix: 'Paste the public anon / publishable key (not the secret key) into VITE_SUPABASE_ANON_KEY, then restart npm run dev.',
    },
    {
      label: 'Database tables are set up',
      ok: s.tablesReady,
      fix: 'Run supabase/migrations/0001_init.sql in the Supabase SQL Editor.',
    },
  ]
}

/** Shows whether the back end is working: reachable, key accepted, tables created. */
export function ConnectionStatusPanel({ className }: { className?: string }) {
  const { connection } = useData()
  const status = useQuery({
    queryKey: ['connection'],
    queryFn: () => connection!.check(),
    enabled: !!connection,
    staleTime: 0,
    retry: false,
  })
  if (!connection) return null

  const checks = status.data ? checksFor(connection.host, status.data) : []
  const firstProblem = checks.find((c) => !c.ok)

  return (
    <Card className={cn('flex flex-col gap-3', className)} aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-medium">Backend connection</h2>
        <Button variant="ghost" onClick={() => void status.refetch()} loading={status.isFetching}>
          Check again
        </Button>
      </div>
      {status.isLoading ? (
        <p className="text-sm text-ink-muted">Checking {connection.host}…</p>
      ) : status.isError ? (
        <p role="alert" className="text-sm text-danger">
          The check itself failed. Try again.
        </p>
      ) : (
        <>
          <ul className="flex flex-col gap-1.5">
            {checks.map((c) => (
              <li key={c.label} className="flex items-start gap-2 text-sm">
                <Icon
                  name={c.ok ? 'check' : 'alert'}
                  size={18}
                  className={cn('mt-0.5 shrink-0', c.ok ? 'text-sage' : 'text-danger')}
                />
                <span>
                  <span className="font-medium">{c.label}</span>
                  <span className="sr-only">{c.ok ? ': yes' : ': no'}</span>
                </span>
              </li>
            ))}
          </ul>
          {firstProblem ? (
            <p className="rounded-md bg-danger-soft p-3 text-sm text-danger">{firstProblem.fix}</p>
          ) : (
            <p className="rounded-md bg-success-soft p-3 text-sm text-success">
              Connected. Your backend is working.
            </p>
          )}
        </>
      )}
    </Card>
  )
}
