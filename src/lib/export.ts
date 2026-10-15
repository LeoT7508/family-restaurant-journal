import type {
  AllergyNote,
  DishEntry,
  FamilyMember,
  Household,
  KidInfo,
  Restaurant,
  Visit,
  WineEntry,
  WishlistItem,
} from '@/types'

export interface JournalSnapshot {
  household: Household
  members: FamilyMember[]
  restaurants: Restaurant[]
  visits: Visit[]
  dishes: DishEntry[]
  wines: WineEntry[]
  kidInfo: KidInfo[]
  allergyNotes: AllergyNote[]
  wishlist: WishlistItem[]
}

export const BACKUP_VERSION = 1

/** A complete backup. It includes allergy notes and family details, so it is for the family only. */
export function buildBackup(snapshot: JournalSnapshot, now = new Date()) {
  return {
    app: 'family-table-journal',
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    ...snapshot,
  }
}

/** Quote a CSV cell, and defuse spreadsheet formulas ("=1+1", "@cmd") so opening the file is safe. */
export function csvCell(value: string | number | boolean | undefined | null): string {
  if (value === undefined || value === null) return ''
  let text = String(value)
  if (/^[=+\-@\t\r]/.test(text) && typeof value === 'string') text = `'${text}`
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/**
 * One row per visit. Deliberately leaves out free-text notes and allergy details,
 * so the CSV is safe to open or share as a food diary.
 */
export function visitsToCsv(snapshot: JournalSnapshot): string {
  const restaurants = new Map(snapshot.restaurants.map((r) => [r.id, r]))
  const members = new Map(snapshot.members.map((m) => [m.id, m]))
  const parents = snapshot.members.filter((m) => m.isParent)
  const finalHeaders = [
    'Date',
    'Restaurant',
    'Cuisine',
    'Price level',
    'Logged by',
    'Family rating',
    ...parents.map((p) => `Rating: ${p.name}`),
    'Go again',
    'Occasions',
    'Total spent',
    'People',
    'Draft',
    'Dishes loved',
    'Wines',
  ]

  const rows = [...snapshot.visits]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((v) => {
      const r = restaurants.get(v.restaurantId)
      const loved = snapshot.dishes
        .filter((d) => d.visitId === v.id && Object.values(d.verdicts).includes('loved'))
        .map((d) => d.name)
        .join('; ')
      const wines = snapshot.wines
        .filter((w) => w.visitId === v.id)
        .map((w) => w.name)
        .join('; ')
      return [
        v.date,
        r?.name,
        r?.cuisine,
        r?.priceLevel,
        members.get(v.loggedBy)?.name,
        v.familyRating,
        ...parents.map((p) => v.ratings[p.id]),
        v.goAgain,
        v.occasions.join('; '),
        v.amountSpent,
        v.partySize,
        v.isDraft ? 'yes' : 'no',
        loved,
        wines,
      ]
        .map(csvCell)
        .join(',')
    })
  return [finalHeaders.map(csvCell).join(','), ...rows].join('\n') + '\n'
}

export function downloadText(filename: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
