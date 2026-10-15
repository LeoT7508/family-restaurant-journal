import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '@/test/renderApp'
import { createMockDataLayer } from '@/data/mock/createMockDataLayer'
import type { AccountService, AccountState, ConnectionStatus, DataLayer } from '@/data/repositories'

/** A small state machine standing in for a real back end's accounts. */
function fakeAccount(initial: AccountState, overrides: Partial<AccountService> = {}) {
  let state = initial
  const calls: string[] = []
  const service: AccountService = {
    getState: async () => state,
    signIn: async (email, password) => {
      calls.push(`signIn:${email}`)
      if (password !== 'correct-horse') throw new Error('That email and password did not match.')
      state = { status: 'ready', email, inviteCode: 'abc123def456' }
    },
    signUp: async (email) => {
      calls.push(`signUp:${email}`)
      return { needsEmailConfirmation: true }
    },
    signOut: async () => {
      calls.push('signOut')
      state = { status: 'signed-out' }
    },
    resendConfirmation: async (email) => {
      calls.push(`resend:${email}`)
    },
    requestPasswordReset: async (email) => {
      calls.push(`reset:${email}`)
    },
    updatePassword: async (password) => {
      calls.push(`updatePassword:${password.length}`)
      state = { status: 'ready', email: 'a@b.co', inviteCode: 'abc123def456' }
    },
    createHousehold: async (setup) => {
      calls.push(`create:${setup.name}:${setup.members.map((m) => m.name).join('+')}`)
      state = { status: 'needs-member', email: 'a@b.co', inviteCode: 'abc123def456' }
    },
    joinHousehold: async (code) => {
      calls.push(`join:${code}`)
      if (code !== 'goodcode123') throw new Error('That invite code was not found.')
      state = { status: 'needs-member', email: 'a@b.co', inviteCode: 'goodcode123' }
    },
    claimMember: async (id) => {
      calls.push(`claim:${id}`)
      state = { status: 'ready', email: 'a@b.co', inviteCode: 'abc123def456' }
    },
    ...overrides,
  }
  return { service, calls }
}

const layerWith = (account: AccountService, connection?: DataLayer['connection']): DataLayer => ({
  ...createMockDataLayer(),
  backend: 'supabase',
  devTools: undefined,
  account,
  connection,
})

describe('sign-in gate', () => {
  it('does nothing when the back end has no accounts (sample data)', async () => {
    renderApp('/')
    expect(await screen.findByRole('link', { name: /log a visit/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /sign in/i })).not.toBeInTheDocument()
  })

  it('asks signed-out people to sign in and shows a plain error for a wrong password', async () => {
    const user = userEvent.setup()
    const { service } = fakeAccount({ status: 'signed-out' })
    renderApp('/', { data: layerWith(service) })
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /log a visit/i })).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('Email'), 'alex@example.com')
    await user.type(screen.getByLabelText('Password'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/did not match/i)
  })

  it('validates the email before calling the server', async () => {
    const user = userEvent.setup()
    const { service, calls } = fakeAccount({ status: 'signed-out' })
    renderApp('/', { data: layerWith(service) })
    await user.type(await screen.findByLabelText('Email'), 'not-an-email')
    await user.type(screen.getByLabelText('Password'), 'x')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText(/valid email/i)).toBeInTheDocument()
    expect(calls).toEqual([])
  })

  it('lets someone sign in and then shows the app', async () => {
    const user = userEvent.setup()
    const { service } = fakeAccount({ status: 'signed-out' })
    renderApp('/', { data: layerWith(service) })
    await user.type(await screen.findByLabelText('Email'), 'alex@example.com')
    await user.type(screen.getByLabelText('Password'), 'correct-horse')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('link', { name: /log a visit/i })).toBeInTheDocument()
  })

  it('creates an account by email and tells them where the confirmation went', async () => {
    const user = userEvent.setup()
    const { service, calls } = fakeAccount({ status: 'signed-out' })
    renderApp('/', { data: layerWith(service) })
    await user.click(await screen.findByRole('tab', { name: 'Create account' }))
    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument()
    await user.type(screen.getByLabelText('Email'), 'sam@example.com')
    await user.type(screen.getByLabelText('Password'), 'longenough1')
    await user.type(screen.getByLabelText('Confirm password'), 'longenough1')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(
      await screen.findByText(/we sent a confirmation link to sam@example\.com/i),
    ).toBeInTheDocument()
    expect(calls).toContain('signUp:sam@example.com')

    await user.click(screen.getByRole('button', { name: /resend the email/i }))
    expect(await screen.findByText(/sent again to sam@example\.com/i)).toBeInTheDocument()
    expect(calls).toContain('resend:sam@example.com')
  })

  it('checks the new password before creating the account', async () => {
    const user = userEvent.setup()
    const { service, calls } = fakeAccount({ status: 'signed-out' })
    renderApp('/', { data: layerWith(service) })
    await user.click(await screen.findByRole('tab', { name: 'Create account' }))
    await user.type(screen.getByLabelText('Email'), 'sam@example.com')
    await user.type(screen.getByLabelText('Password'), 'short')
    await user.type(screen.getByLabelText('Confirm password'), 'different')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByText(/use at least 8 characters/i)).toBeInTheDocument()
    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
    expect(calls).toEqual([])
  })

  it('lets you show the password to catch typos', async () => {
    const user = userEvent.setup()
    const { service } = fakeAccount({ status: 'signed-out' })
    renderApp('/', { data: layerWith(service) })
    const field = await screen.findByLabelText('Password')
    expect(field).toHaveAttribute('type', 'password')
    await user.click(screen.getByRole('button', { name: /show password/i }))
    expect(field).toHaveAttribute('type', 'text')
    await user.click(screen.getByRole('button', { name: /hide password/i }))
    expect(field).toHaveAttribute('type', 'password')
  })

  it('sends a password-reset email without revealing whether the address has an account', async () => {
    const user = userEvent.setup()
    const { service, calls } = fakeAccount({ status: 'signed-out' })
    renderApp('/', { data: layerWith(service) })
    await user.click(await screen.findByRole('button', { name: /forgot your password/i }))
    expect(screen.getByRole('heading', { name: 'Reset your password' })).toBeInTheDocument()
    await user.type(screen.getByLabelText('Email'), 'maybe@example.com')
    await user.click(screen.getByRole('button', { name: /send reset link/i }))
    expect(
      await screen.findByText(/if maybe@example\.com has an account, a reset link is on its way/i),
    ).toBeInTheDocument()
    expect(calls).toContain('reset:maybe@example.com')
    await user.click(screen.getByRole('button', { name: /back to sign in/i }))
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('asks for a new password after a reset link, then continues', async () => {
    const user = userEvent.setup()
    const { service, calls } = fakeAccount({
      status: 'password-recovery',
      email: 'alex@example.com',
    })
    renderApp('/', { data: layerWith(service) })
    expect(
      await screen.findByRole('heading', { name: /choose a new password/i }),
    ).toBeInTheDocument()
    await user.type(screen.getByLabelText('New password'), 'brand-new-pass')
    await user.type(screen.getByLabelText('Confirm new password'), 'something-else')
    await user.click(screen.getByRole('button', { name: /save new password/i }))
    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument()
    expect(calls).toEqual([])
    await user.clear(screen.getByLabelText('Confirm new password'))
    await user.type(screen.getByLabelText('Confirm new password'), 'brand-new-pass')
    await user.click(screen.getByRole('button', { name: /save new password/i }))
    expect(await screen.findByRole('link', { name: /log a visit/i })).toBeInTheDocument()
    expect(calls).toContain('updatePassword:14')
  })

  it('sets up a household and then asks which parent you are', async () => {
    const user = userEvent.setup()
    const { service, calls } = fakeAccount({ status: 'needs-household', email: 'a@b.co' })
    renderApp('/', { data: layerWith(service) })
    expect(
      await screen.findByRole('heading', { name: /set up your household/i }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /create our journal/i }))
    expect(calls).toContain('create:Our family:Alex+Sam+Max+Mia')
    expect(
      await screen.findByRole('heading', { name: /which parent are you/i }),
    ).toBeInTheDocument()
    expect(screen.getByText('abc123def456')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /i'm sam/i }))
    expect(calls).toContain('claim:sam')
    expect(await screen.findByRole('link', { name: /log a visit/i })).toBeInTheDocument()
  })

  it('joins a partner with an invite code and shows a bad-code error', async () => {
    const user = userEvent.setup()
    const { service, calls } = fakeAccount({ status: 'needs-household', email: 'a@b.co' })
    renderApp('/', { data: layerWith(service) })
    await user.type(await screen.findByLabelText('Invite code'), 'badcode123')
    await user.click(screen.getByRole('button', { name: /join household/i }))
    expect(await screen.findByText(/invite code was not found/i)).toBeInTheDocument()
    await user.clear(screen.getByLabelText('Invite code'))
    await user.type(screen.getByLabelText('Invite code'), 'goodcode123')
    await user.click(screen.getByRole('button', { name: /join household/i }))
    expect(
      await screen.findByRole('heading', { name: /which parent are you/i }),
    ).toBeInTheDocument()
    expect(calls).toContain('join:goodcode123')
  })

  it('shows a retry when the server can’t be reached', async () => {
    const getState = vi.fn().mockRejectedValue(new Error('offline'))
    const { service } = fakeAccount({ status: 'signed-out' }, { getState })
    renderApp('/', { data: layerWith(service) })
    expect(await screen.findByText(/can't reach the server/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('shows the account, invite code and sign-out in Profile, and signing out returns to sign-in', async () => {
    const user = userEvent.setup()
    const { service, calls } = fakeAccount({
      status: 'ready',
      email: 'alex@example.com',
      inviteCode: 'abc123def456',
    })
    renderApp('/profile', { data: layerWith(service) })
    expect(await screen.findByText(/signed in as alex@example.com/i)).toBeInTheDocument()
    expect(screen.getByText('abc123def456')).toBeInTheDocument()
    // No Alex/Sam switcher with real accounts, and no sample-data reset.
    expect(
      screen.queryByRole('radiogroup', { name: /who is using the app/i }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText(/restore sample data/i)).not.toBeInTheDocument()
    expect(screen.getByText(/saved securely online/i)).toBeInTheDocument()

    await user.click(within(screen.getByRole('main')).getByRole('button', { name: 'Sign out' }))
    await waitFor(() => expect(calls).toContain('signOut'))
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(within(document.body).queryByText('abc123def456')).not.toBeInTheDocument()
  })

  it('explains that sample data is local when there is no back end', async () => {
    renderApp('/profile')
    expect(
      await screen.findByText(/using sample data saved only in this browser/i),
    ).toBeInTheDocument()
  })

  describe('connection check on the sign-in page', () => {
    const connection = (statuses: ConnectionStatus[]) => {
      const check = vi.fn()
      statuses.forEach((st) => check.mockResolvedValueOnce(st))
      check.mockResolvedValue(statuses[statuses.length - 1])
      return { host: 'abc.supabase.co', check }
    }

    it('confirms the backend is working', async () => {
      const { service } = fakeAccount({ status: 'signed-out' })
      const conn = connection([{ reachable: true, keyAccepted: true, tablesReady: true }])
      renderApp('/', { data: layerWith(service, conn) })
      expect(await screen.findByText('Connected. Your backend is working.')).toBeInTheDocument()
      expect(screen.getByText('Reached abc.supabase.co')).toBeInTheDocument()
      expect(screen.getByText('Project accepted the key')).toBeInTheDocument()
      expect(screen.getByText('Database tables are set up')).toBeInTheDocument()
    })

    it('says what to fix when the tables are missing, and re-checks on request', async () => {
      const user = userEvent.setup()
      const { service } = fakeAccount({ status: 'signed-out' })
      const conn = connection([
        { reachable: true, keyAccepted: true, tablesReady: false },
        { reachable: true, keyAccepted: true, tablesReady: true },
      ])
      renderApp('/', { data: layerWith(service, conn) })
      expect(
        await screen.findByText(/run supabase\/migrations\/0001_init\.sql/i),
      ).toBeInTheDocument()
      expect(screen.queryByText(/your backend is working/i)).not.toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: /check again/i }))
      expect(await screen.findByText('Connected. Your backend is working.')).toBeInTheDocument()
      expect(conn.check).toHaveBeenCalledTimes(2)
    })

    it('points at the key when the project rejects it', async () => {
      const { service } = fakeAccount({ status: 'signed-out' })
      const conn = connection([{ reachable: true, keyAccepted: false, tablesReady: false }])
      renderApp('/', { data: layerWith(service, conn) })
      expect(await screen.findByText(/anon \/ publishable key/i)).toBeInTheDocument()
    })

    it('points at the URL when the project cannot be reached', async () => {
      const { service } = fakeAccount({ status: 'signed-out' })
      const conn = connection([{ reachable: false, keyAccepted: false, tablesReady: false }])
      renderApp('/', { data: layerWith(service, conn) })
      expect(await screen.findByText(/check vite_supabase_url/i)).toBeInTheDocument()
    })
  })

  describe('sign out', () => {
    it('is always one tap away in the app header or sidebar, and returns to the sign-in page', async () => {
      const user = userEvent.setup()
      const { service, calls } = fakeAccount({
        status: 'ready',
        email: 'a@b.co',
        inviteCode: 'abc123def456',
      })
      renderApp('/', { data: layerWith(service) })
      const buttons = await screen.findAllByRole('button', { name: 'Sign out' })
      expect(buttons.length).toBeGreaterThanOrEqual(1)
      await user.click(buttons[0]!)
      await waitFor(() => expect(calls).toContain('signOut'))
      expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: /log a visit/i })).not.toBeInTheDocument()
    })

    it('does not appear with sample data, which has no sign-in', async () => {
      renderApp('/')
      await screen.findByRole('link', { name: /log a visit/i })
      expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument()
    })
  })
})
