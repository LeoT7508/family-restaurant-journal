import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  AccountService,
  AccountState,
  HouseholdSetup,
  SignUpResult,
} from '@/data/repositories'
import { friendlyError } from './mapping'
import type { HouseholdScope } from './scope'

const MIN_PASSWORD = 8

const signInMessage = (message: string) =>
  /invalid login credentials/i.test(message)
    ? 'That email and password did not match.'
    : /email not confirmed/i.test(message)
      ? 'Please confirm your email first. Check your inbox for the link.'
      : message

const currentOrigin = () => (typeof window !== 'undefined' ? window.location.origin : undefined)

export class SupabaseAccountService implements AccountService {
  /** True after the person followed a "reset your password" link and hasn't chosen a new one yet. */
  private recovering =
    typeof window !== 'undefined' && /(^|[#&])type=recovery(&|$)/.test(window.location.hash)

  constructor(
    private readonly client: SupabaseClient,
    private readonly scope: HouseholdScope,
    /** Where email links send people back to. Must be allowed in Supabase Auth -> URL Configuration. */
    private readonly redirectTo: string | undefined = currentOrigin(),
  ) {
    client.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') this.recovering = true
    })
  }

  async getState(): Promise<AccountState> {
    const { data } = await this.client.auth.getSession()
    const user = data.session?.user
    if (!user) return { status: 'signed-out' }
    const email = user.email ?? ''
    if (this.recovering) return { status: 'password-recovery', email }
    const membership = await this.scope.membership()
    if (!membership) return { status: 'needs-household', email }

    const { data: household } = await this.client
      .from('households')
      .select('invite_code')
      .eq('id', membership.householdId)
      .maybeSingle()
    const inviteCode = (household?.invite_code as string | undefined) ?? null
    return membership.memberId
      ? { status: 'ready', email, inviteCode }
      : { status: 'needs-member', email, inviteCode }
  }

  async signIn(email: string, password: string): Promise<void> {
    const { error } = await this.client.auth.signInWithPassword({ email: email.trim(), password })
    if (error) throw new Error(signInMessage(error.message))
    this.scope.reset()
  }

  async signUp(email: string, password: string): Promise<SignUpResult> {
    if (password.length < MIN_PASSWORD) {
      throw new Error(`Use a password with at least ${MIN_PASSWORD} characters.`)
    }
    const { data, error } = await this.client.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: this.redirectTo },
    })
    if (error) throw new Error(error.message)
    // Supabase hides "already registered" by returning a user with no identities.
    if (data.user && (data.user.identities?.length ?? 1) === 0) {
      throw new Error('That email already has an account. Try signing in.')
    }
    this.scope.reset()
    return { needsEmailConfirmation: !data.session }
  }

  async signOut(): Promise<void> {
    this.recovering = false
    await this.client.auth.signOut()
    this.scope.reset()
  }

  async resendConfirmation(email: string): Promise<void> {
    const { error } = await this.client.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: { emailRedirectTo: this.redirectTo },
    })
    if (error) throw new Error(error.message)
  }

  async requestPasswordReset(email: string): Promise<void> {
    const { error } = await this.client.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: this.redirectTo,
    })
    if (error) throw new Error(error.message)
  }

  async updatePassword(password: string): Promise<void> {
    if (password.length < MIN_PASSWORD) {
      throw new Error(`Use a password with at least ${MIN_PASSWORD} characters.`)
    }
    const { error } = await this.client.auth.updateUser({ password })
    if (error) throw new Error(error.message)
    this.recovering = false
  }

  async createHousehold(setup: HouseholdSetup): Promise<void> {
    const { error } = await this.client.rpc('create_household', {
      p_name: setup.name.trim(),
      p_zip: setup.homeZip,
      p_label: setup.homeLabel,
      p_radius: setup.driveRadiusMinutes,
      p_members: setup.members.map((m) => ({
        name: m.name,
        role: m.role,
        age: m.age ?? null,
        allergies: m.allergies,
      })),
    })
    if (error) throw friendlyError(error)
    this.scope.reset()
  }

  async joinHousehold(inviteCode: string): Promise<void> {
    const { error } = await this.client.rpc('join_household', { p_code: inviteCode })
    if (error) throw friendlyError(error)
    this.scope.reset()
  }

  async claimMember(memberId: string): Promise<void> {
    const { error } = await this.client.rpc('claim_member', { p_member_id: memberId })
    if (error) throw friendlyError(error)
    this.scope.reset()
  }
}
