import { tripDestination } from './trip'

/** Today as YYYY-MM-DD in the user's local time zone. */
export function todayISO(now = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** "Sep 27, 2026" from "2026-09-27" without time zone surprises. */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export const formatPrice = (level: number): string => '$'.repeat(Math.min(4, Math.max(1, level)))

export const formatMoney = (amount: number): string =>
  amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

export const formatDrive = (minutes: number): string => `${minutes} min drive`

/** "12 min drive" near home, or "On trip: Orlando" for places saved while travelling. */
export function describeDistance(place: { driveMinutes: number; tags: readonly string[] }): string {
  const trip = tripDestination(place.tags)
  return trip ? `On trip: ${trip}` : formatDrive(place.driveMinutes)
}

/** Cost per person, or null when we can't tell. */
export function perPerson(amount?: number, partySize?: number): number | null {
  if (amount === undefined || !partySize) return null
  return Math.round((amount / partySize) * 100) / 100
}

/** "3 weeks ago" from "2026-09-10". Used so old allergy notes visibly age. */
export function timeAgo(iso: string, now = new Date()): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return ''
  const days = Math.floor((now.getTime() - new Date(y, m - 1, d).getTime()) / 86_400_000)
  if (days < 1) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 14) return `${days} days ago`
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`
  if (days < 730) return `${Math.floor(days / 30)} months ago`
  return `${Math.floor(days / 365)} years ago`
}
