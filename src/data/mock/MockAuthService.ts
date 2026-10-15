import type { AuthService, Session } from '@/data/repositories'
import { STORAGE_PREFIX } from './LocalStorageStore'

const KEY = `${STORAGE_PREFIX}session`
const DEFAULT_MEMBER = 'alex'

/** Not real auth: it just remembers which parent is using the app. */
export class MockAuthService implements AuthService {
  async getSession(): Promise<Session | null> {
    try {
      const memberId = localStorage.getItem(KEY) ?? DEFAULT_MEMBER
      return { memberId }
    } catch {
      return { memberId: DEFAULT_MEMBER }
    }
  }
  async signInAs(memberId: string): Promise<Session> {
    try {
      localStorage.setItem(KEY, memberId)
    } catch {
      /* the switcher still works for this page load */
    }
    return { memberId }
  }
  async signOut(): Promise<void> {
    try {
      localStorage.removeItem(KEY)
    } catch {
      /* nothing to do */
    }
  }
}
