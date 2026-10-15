import { useState, type ReactNode } from 'react'
import { useForm, type UseFormRegisterReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, Input, Tabs } from '@/components/ui'
import type { AccountActions } from '@/hooks/account'
import { AuthShell } from './AuthShell'

const MIN_PASSWORD = 8

const email = z
  .string()
  .trim()
  .min(1, 'Enter your email address')
  .email('Enter a valid email address')
const signInSchema = z.object({ email, password: z.string().min(1, 'Enter your password') })
const signUpSchema = z
  .object({
    email,
    password: z.string().min(MIN_PASSWORD, `Use at least ${MIN_PASSWORD} characters`),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ['confirm'],
    message: 'The passwords do not match',
  })
const forgotSchema = z.object({ email })

type Mode = 'in' | 'up' | 'forgot'

/** A password box with a Show/Hide button, so typos on a phone are easy to catch. */
function PasswordField({
  label,
  error,
  hint,
  autoComplete,
  disabled,
  registration,
}: {
  label: string
  error?: string
  hint?: string
  autoComplete: string
  disabled?: boolean
  registration: UseFormRegisterReturn
}) {
  const [shown, setShown] = useState(false)
  return (
    <div className="flex flex-col gap-1">
      <Input
        label={label}
        type={shown ? 'text' : 'password'}
        autoComplete={autoComplete}
        hint={hint}
        error={error}
        disabled={disabled}
        {...registration}
      />
      <button
        type="button"
        aria-pressed={shown}
        disabled={disabled}
        onClick={() => setShown((s) => !s)}
        className="self-start text-sm font-medium text-accent underline underline-offset-4 disabled:opacity-50"
      >
        {shown ? 'Hide password' : 'Show password'}
      </button>
    </div>
  )
}

function Message({ kind, children }: { kind: 'error' | 'notice'; children: ReactNode }) {
  return kind === 'error' ? (
    <p role="alert" className="rounded-md bg-danger-soft p-3 text-sm text-danger">
      {children}
    </p>
  ) : (
    <p role="status" className="rounded-md bg-accent-soft p-3 text-sm text-accent">
      {children}
    </p>
  )
}

interface AuthPageProps {
  /** The real actions, or null to show the page as a disabled preview (backend not connected yet). */
  actions: AccountActions | null
  /** Extra content under the form, such as the connection check. */
  footer?: ReactNode
}

/** Email sign-in, account creation (with email confirmation) and password reset. */
export function AuthPage({ actions, footer }: AuthPageProps) {
  const preview = actions === null
  const [mode, setMode] = useState<Mode>('in')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  /** Set after sign-up needs confirming, so we can offer to resend to that address. */
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)

  const signIn = useForm({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  })
  const signUp = useForm({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: '', password: '', confirm: '' },
  })
  const forgot = useForm({ resolver: zodResolver(forgotSchema), defaultValues: { email: '' } })

  const run = async (work: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await work()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const switchMode = (next: Mode) => {
    setMode(next)
    setError(null)
    setNotice(null)
    setPendingEmail(null)
  }

  const title =
    mode === 'in' ? 'Sign in' : mode === 'up' ? 'Create your account' : 'Reset your password'
  const subtitle =
    mode === 'forgot'
      ? "Enter your email and we'll send you a link to choose a new password."
      : "Your family's journal is private. Only people in your household can see it."

  return (
    <AuthShell title={title} subtitle={subtitle}>
      {preview && (
        <p role="note" className="rounded-md bg-surface-2 p-3 text-sm text-ink-muted">
          Preview only: the app isn&apos;t connected to your backend yet, so this form is turned
          off. Finish the setup below and it switches on.
        </p>
      )}

      {mode !== 'forgot' && (
        <Tabs
          label="Account"
          value={mode}
          onChange={(m) => switchMode(m)}
          items={[
            { value: 'in', label: 'Sign in' },
            { value: 'up', label: 'Create account' },
          ]}
        />
      )}

      {mode === 'in' && (
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={signIn.handleSubmit((v) => run(() => actions!.signIn(v.email, v.password)))}
        >
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            inputMode="email"
            disabled={preview}
            error={signIn.formState.errors.email?.message}
            {...signIn.register('email')}
          />
          <PasswordField
            label="Password"
            autoComplete="current-password"
            disabled={preview}
            error={signIn.formState.errors.password?.message}
            registration={signIn.register('password')}
          />
          {notice && <Message kind="notice">{notice}</Message>}
          {error && <Message kind="error">{error}</Message>}
          <Button type="submit" size="lg" loading={busy} disabled={preview} fullWidth>
            Sign in
          </Button>
          <button
            type="button"
            disabled={preview}
            onClick={() => switchMode('forgot')}
            className="self-start text-sm font-medium text-accent underline underline-offset-4 disabled:opacity-50"
          >
            Forgot your password?
          </button>
        </form>
      )}

      {mode === 'up' && (
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={signUp.handleSubmit((v) =>
            run(async () => {
              const result = await actions!.signUp(v.email, v.password)
              if (result.needsEmailConfirmation) {
                setPendingEmail(v.email.trim())
                setNotice(
                  `We sent a confirmation link to ${v.email.trim()}. Open it, then come back and sign in.`,
                )
              }
            }),
          )}
        >
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            inputMode="email"
            disabled={preview}
            error={signUp.formState.errors.email?.message}
            {...signUp.register('email')}
          />
          <PasswordField
            label="Password"
            autoComplete="new-password"
            hint={`At least ${MIN_PASSWORD} characters.`}
            disabled={preview}
            error={signUp.formState.errors.password?.message}
            registration={signUp.register('password')}
          />
          <PasswordField
            label="Confirm password"
            autoComplete="new-password"
            disabled={preview}
            error={signUp.formState.errors.confirm?.message}
            registration={signUp.register('confirm')}
          />
          {notice && <Message kind="notice">{notice}</Message>}
          {error && <Message kind="error">{error}</Message>}
          <Button type="submit" size="lg" loading={busy} disabled={preview} fullWidth>
            Create account
          </Button>
          {pendingEmail && (
            <Button
              variant="ghost"
              className="self-start"
              loading={busy}
              onClick={() =>
                run(async () => {
                  await actions!.resend(pendingEmail)
                  setNotice(`Sent again to ${pendingEmail}. Check your spam folder too.`)
                })
              }
            >
              Resend the email
            </Button>
          )}
        </form>
      )}

      {mode === 'forgot' && (
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={forgot.handleSubmit((v) =>
            run(async () => {
              await actions!.forgot(v.email)
              // Same message whether or not the address has an account, so it can't be used to look people up.
              setNotice(`If ${v.email.trim()} has an account, a reset link is on its way.`)
            }),
          )}
        >
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            inputMode="email"
            disabled={preview}
            error={forgot.formState.errors.email?.message}
            {...forgot.register('email')}
          />
          {notice && <Message kind="notice">{notice}</Message>}
          {error && <Message kind="error">{error}</Message>}
          <Button type="submit" size="lg" loading={busy} disabled={preview} fullWidth>
            Send reset link
          </Button>
          <button
            type="button"
            onClick={() => switchMode('in')}
            className="self-start text-sm font-medium text-accent underline underline-offset-4"
          >
            Back to sign in
          </button>
        </form>
      )}

      {footer}
    </AuthShell>
  )
}

const recoverySchema = z
  .object({
    password: z.string().min(MIN_PASSWORD, `Use at least ${MIN_PASSWORD} characters`),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ['confirm'],
    message: 'The passwords do not match',
  })

/** Shown after someone follows the link in a password-reset email. */
export function RecoveryPage({ email, actions }: { email: string; actions: AccountActions }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const form = useForm({
    resolver: zodResolver(recoverySchema),
    defaultValues: { password: '', confirm: '' },
  })
  return (
    <AuthShell title="Choose a new password" subtitle={`For ${email}.`}>
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={form.handleSubmit(async (v) => {
          setBusy(true)
          setError(null)
          try {
            await actions.updatePassword(v.password)
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not change the password.')
          } finally {
            setBusy(false)
          }
        })}
      >
        <PasswordField
          label="New password"
          autoComplete="new-password"
          hint={`At least ${MIN_PASSWORD} characters.`}
          error={form.formState.errors.password?.message}
          registration={form.register('password')}
        />
        <PasswordField
          label="Confirm new password"
          autoComplete="new-password"
          error={form.formState.errors.confirm?.message}
          registration={form.register('confirm')}
        />
        {error && <Message kind="error">{error}</Message>}
        <Button type="submit" size="lg" loading={busy} fullWidth>
          Save new password
        </Button>
      </form>
    </AuthShell>
  )
}
