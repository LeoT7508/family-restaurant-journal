import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
  sessionStorage.clear()
})

/** Loads the app fresh so it re-reads the (stubbed) environment, like a restart of npm run dev. */
async function loadApp() {
  vi.resetModules()
  const [{ default: App }, { createTestRouter }, { createQueryClient }] = await Promise.all([
    import('@/App'),
    import('@/router'),
    import('@/lib/queryClient'),
  ])
  render(<App router={createTestRouter(['/'])} queryClient={createQueryClient()} />)
}

describe('half-finished Supabase setup (URL set, key missing)', () => {
  it('says so instead of silently showing sample data, and explains the fix', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://abc123.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')
    await loadApp()
    expect(await screen.findByRole('heading', { name: /almost connected/i })).toBeInTheDocument()
    expect(screen.getByText('abc123.supabase.co')).toBeInTheDocument()
    expect(screen.getByText(/VITE_SUPABASE_ANON_KEY=/)).toBeInTheDocument()
    expect(screen.getByText(/never use the secret or service_role key/i)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /log a visit/i })).not.toBeInTheDocument()
  })

  it('shows the real sign-in page as a switched-off preview', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://abc123.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')
    await loadApp()
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.getByRole('note')).toHaveTextContent(/preview only/i)
    expect(screen.getByLabelText('Email')).toBeDisabled()
    expect(screen.getByLabelText('Password')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled()
    expect(screen.getByRole('tab', { name: 'Create account' })).toBeInTheDocument()
  })

  it('lets you continue with sample data for the rest of the session', async () => {
    const user = userEvent.setup()
    vi.stubEnv('VITE_SUPABASE_URL', 'https://abc123.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')
    await loadApp()
    await user.click(await screen.findByRole('button', { name: /use sample data for now/i }))
    expect(await screen.findByRole('link', { name: /log a visit/i })).toBeInTheDocument()
  })

  it('stays out of the way when nothing is configured', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')
    await loadApp()
    expect(await screen.findByRole('link', { name: /log a visit/i })).toBeInTheDocument()
    expect(screen.queryByText(/almost connected/i)).not.toBeInTheDocument()
  })
})
