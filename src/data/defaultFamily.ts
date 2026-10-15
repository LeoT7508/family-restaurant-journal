import type { FamilyMember } from '@/types'

/** The family profiles a new household starts with. Edit them later in Profile. */
export const DEFAULT_FAMILY: Pick<FamilyMember, 'name' | 'role' | 'age' | 'allergies'>[] = [
  { name: 'Alex', role: 'parent', allergies: [] },
  { name: 'Sam', role: 'parent', allergies: [] },
  { name: 'Max', role: 'child', age: 6, allergies: [] },
  { name: 'Mia', role: 'child', age: 2, allergies: ['egg'] },
]

export const DEFAULT_HOME = {
  homeZip: '60601',
  homeLabel: 'Chicago, IL 60601',
  driveRadiusMinutes: 20,
}
