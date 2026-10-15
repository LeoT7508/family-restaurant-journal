export interface Session {
  /** The family member who is logged in (a parent). */
  memberId: string
}

/**
 * Who is using the app. The mock is a Alex/Sam switcher; real auth replaces it later.
 */
export interface AuthService {
  getSession(): Promise<Session | null>
  signInAs(memberId: string): Promise<Session>
  signOut(): Promise<void>
}
