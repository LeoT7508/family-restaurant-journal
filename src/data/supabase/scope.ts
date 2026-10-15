import type { SupabaseClient } from '@supabase/supabase-js'
import { friendlyError } from './mapping'

export interface Membership {
  householdId: string
  /** Which family parent this login is, once they have picked one. */
  memberId: string | null
}

/** Tells repositories which household they are working in. */
export interface HouseholdScope {
  householdId(): Promise<string>
  membership(): Promise<Membership | null>
  /** Forget what we know (after sign-in, sign-out or joining a household). */
  reset(): void
}

export class SupabaseHouseholdScope implements HouseholdScope {
  private cached: Promise<Membership | null> | null = null

  constructor(private readonly client: SupabaseClient) {
    client.auth.onAuthStateChange(() => this.reset())
  }

  reset(): void {
    this.cached = null
  }

  membership(): Promise<Membership | null> {
    if (!this.cached) {
      this.cached = this.load().catch((error) => {
        this.cached = null
        throw error
      })
    }
    return this.cached
  }

  async householdId(): Promise<string> {
    const m = await this.membership()
    if (!m) throw new Error('Set up or join a household first.')
    return m.householdId
  }

  private async load(): Promise<Membership | null> {
    const { data: session } = await this.client.auth.getSession()
    const user = session.session?.user
    if (!user) return null
    const { data, error } = await this.client
      .from('household_memberships')
      .select('household_id, family_member_id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (error) throw friendlyError(error)
    if (!data) return null
    return {
      householdId: data.household_id as string,
      memberId: (data.family_member_id as string | null) ?? null,
    }
  }
}
