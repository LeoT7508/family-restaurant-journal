import type { DishEntry, FamilyMember, AllergyStatus, Visit } from '@/types'

/**
 * Allergy copy and rules. IMPORTANT: this app never claims a restaurant or dish is safe.
 * It only shows the family's own dated notes and always prompts to confirm again.
 */
export const CONFIRM_PROMPT = 'Confirm with the restaurant again.'
export const NOTES_DISCLAIMER = 'These are your own notes, not a guarantee.'

/** Label and hint for the journal filter. It reads only the family's past dish notes. */
export const SAFE_FILTER_LABEL = 'Safe for Mia'
export const SAFE_FILTER_HINT =
  'Based only on dishes you marked as fine in your own past notes. Always confirm again.'

/** "Mia: egg" — a neutral badge label for a family member with allergies. */
export function allergyBadgeLabel(member: Pick<FamilyMember, 'name' | 'allergies'>): string | null {
  if (member.allergies.length === 0) return null
  return `${member.name}: ${member.allergies.join(', ')}`
}

export function membersWithAllergies(members: FamilyMember[]): FamilyMember[] {
  return members.filter((m) => m.allergies.length > 0)
}

/** Wording for a dish's status. These describe what the family noted, never a guarantee. */
export function dishStatusLabel(status: AllergyStatus, name: string): string {
  if (status === 'safe') return `${name} ate it fine (our note)`
  if (status === 'avoid') return `Skip for ${name} (our note)`
  return `Not sure for ${name}`
}

/**
 * Restaurants where the family has marked at least one dish as fine for Mia.
 * Uses ONLY the family's own dish notes, never inference, and never says anything is "safe".
 */
export function restaurantIdsWithSafeNotes(
  dishes: Pick<DishEntry, 'visitId' | 'safeForAllergy'>[],
  visits: Pick<Visit, 'id' | 'restaurantId'>[],
): Set<string> {
  const restaurantByVisit = new Map(visits.map((v) => [v.id, v.restaurantId]))
  const result = new Set<string>()
  for (const dish of dishes) {
    if (dish.safeForAllergy !== 'safe') continue
    const restaurantId = restaurantByVisit.get(dish.visitId)
    if (restaurantId) result.add(restaurantId)
  }
  return result
}

/** Words the UI must never use to describe food or restaurants. Used by tests. */
export const FORBIDDEN_SAFETY_CLAIMS = [
  /egg[-\s]?safe/i,
  /egg[-\s]?free/i,
  /guaranteed/i,
  /allergen[-\s]?free/i,
  /is safe for/i,
  /100% safe/i,
]
