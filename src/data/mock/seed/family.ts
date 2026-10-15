import type { FamilyMember, Household } from '@/types'
import { base, IDS } from './helpers'

export const seedHousehold = (): Household[] => [
  {
    ...base('household-1'),
    name: 'The Sample family',
    homeZip: '60601',
    homeLabel: 'Chicago, IL 60601',
    driveRadiusMinutes: 20,
  },
]

export const seedMembers = (): FamilyMember[] => [
  { ...base(IDS.alex), name: 'Alex', role: 'parent', allergies: [], isParent: true },
  { ...base(IDS.sam), name: 'Sam', role: 'parent', allergies: [], isParent: true },
  { ...base(IDS.max), name: 'Max', role: 'child', age: 6, allergies: [], isParent: false },
  { ...base(IDS.mia), name: 'Mia', role: 'child', age: 2, allergies: ['egg'], isParent: false },
]
