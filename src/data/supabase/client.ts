import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/** Reads the role claim from a JWT-style key without verifying it (we only want to refuse the wrong key). */
function jwtRole(key: string): string | null {
  const parts = key.split('.')
  if (parts.length !== 3) return null
  try {
    const json = atob(parts[1]!.replace(/-/g, '+').replace(/_/g, '/'))
    const role = (JSON.parse(json) as { role?: unknown }).role
    return typeof role === 'string' ? role : null
  } catch {
    return null
  }
}

/**
 * The service_role / secret key bypasses every security rule. It must never ship in a web app,
 * so we refuse to start with it.
 */
export function assertPublicKey(key: string): void {
  if (key.startsWith('sb_secret_') || jwtRole(key) === 'service_role') {
    throw new Error(
      'That is a secret (service_role) key. Put the public anon / publishable key in VITE_SUPABASE_ANON_KEY instead.',
    )
  }
}

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

/** The project address (no secrets), for display. */
export const supabaseHost = url ? url.replace(/^https?:\/\//, '').replace(/\/$/, '') : ''

/** True when the URL is set but the key is missing: the most common half-finished setup. */
export const isSupabaseKeyMissing = Boolean(url) && !key

export const supabaseCredentials = { url, key }

/** True when both env values are present, so the app should use Supabase instead of the mock. */
export const isSupabaseConfigured = Boolean(url && key && /^https:\/\/.+/.test(url))

export function createSupabaseClient(): SupabaseClient {
  if (!url || !key) throw new Error('Supabase is not configured.')
  assertPublicKey(key)
  return createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  })
}
