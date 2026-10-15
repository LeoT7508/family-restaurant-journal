import type { SupabaseClient } from '@supabase/supabase-js'
import type { AuthService, Session } from '@/data/repositories'
import type { HouseholdScope } from './scope'

/** The "who is logging" session: the signed-in person's family parent. */
export class SupabaseAuthService implements AuthService {
  constructor(
    private readonly client: SupabaseClient,
    private readonly scope: HouseholdScope,
  ) {}

  async getSession(): Promise<Session | null> {
    const { data } = await this.client.auth.getSession()
    if (!data.session) return null
    const membership = await this.scope.membership()
    return membership?.memberId ? { memberId: membership.memberId } : null
  }

  async signInAs(): Promise<Session> {
    throw new Error(
      'Switching people is only for the sample data. Sign out and sign in as someone else.',
    )
  }

  async signOut(): Promise<void> {
    await this.client.auth.signOut()
    this.scope.reset()
  }
}
