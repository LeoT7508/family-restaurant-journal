import { Button, Card } from '@/components/ui'
import { useBackendInfo } from '@/data/DataProvider'
import { AuthPage } from './AuthPage'

/**
 * Shown when the Supabase URL is set but the key is missing. Without this the app would quietly fall
 * back to sample data and it would look like the backend simply isn't working. It shows the real
 * sign-in page as a disabled preview, plus exactly what is left to do.
 */
export function SetupNeeded({ onContinue }: { onContinue: () => void }) {
  const { host } = useBackendInfo()
  return (
    <AuthPage
      actions={null}
      footer={
        <>
          <Card className="flex flex-col gap-3">
            <h2 className="text-base font-medium">Almost connected</h2>
            <p className="text-sm text-ink-muted">
              Your project <strong className="font-medium text-ink">{host}</strong> is set, but the
              app has no key to sign in with yet.
            </p>
            <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm">
              <li>
                In Supabase, open{' '}
                <strong className="font-medium">Project Settings → API Keys</strong> and copy the
                public <strong className="font-medium">anon / publishable</strong> key.
              </li>
              <li>
                Paste it after{' '}
                <code className="rounded bg-surface-2 px-1">VITE_SUPABASE_ANON_KEY=</code> in{' '}
                <code className="rounded bg-surface-2 px-1">.env.local</code>.
              </li>
              <li>
                Stop and restart <code className="rounded bg-surface-2 px-1">npm run dev</code>.
                This form turns on.
              </li>
            </ol>
            <p className="text-sm text-ink-muted">Never use the secret or service_role key.</p>
          </Card>
          <Button variant="secondary" onClick={onContinue}>
            Use sample data for now
          </Button>
        </>
      }
    />
  )
}
