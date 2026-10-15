import type { FamilyMember } from '@/types'

/** Where a person is in getting from "signed out" to "using the journal". */
export type AccountState =
  | { status: 'signed-out' }
  /** Arrived from a "reset your password" email and must choose a new password. */
  | { status: 'password-recovery'; email: string }
  | { status: 'needs-household'; email: string }
  | { status: 'needs-member'; email: string; inviteCode: string | null }
  | { status: 'ready'; email: string; inviteCode: string | null }

export interface SignUpResult {
  /** True when the person must click a link in their email before they can sign in. */
  needsEmailConfirmation: boolean
}

export interface HouseholdSetup {
  name: string
  homeZip: string
  homeLabel: string
  driveRadiusMinutes: number
  members: Pick<FamilyMember, 'name' | 'role' | 'age' | 'allergies'>[]
}

/**
 * Real accounts. Only a back end with logins provides this; the mock does not, and the app skips
 * the sign-in screens when it is absent.
 */
export interface AccountService {
  getState(): Promise<AccountState>
  signIn(email: string, password: string): Promise<void>
  signUp(email: string, password: string): Promise<SignUpResult>
  signOut(): Promise<void>
  /** Sends the confirmation email again. */
  resendConfirmation(email: string): Promise<void>
  /** Emails a link to choose a new password. */
  requestPasswordReset(email: string): Promise<void>
  /** Sets a new password (after following a reset link). */
  updatePassword(password: string): Promise<void>
  createHousehold(setup: HouseholdSetup): Promise<void>
  joinHousehold(inviteCode: string): Promise<void>
  /** Choose which parent you are. */
  claimMember(memberId: string): Promise<void>
}
