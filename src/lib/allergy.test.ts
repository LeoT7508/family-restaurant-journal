import { describe, expect, it } from 'vitest'
import {
  allergyBadgeLabel,
  CONFIRM_PROMPT,
  FORBIDDEN_SAFETY_CLAIMS,
  NOTES_DISCLAIMER,
  membersWithAllergies,
} from './allergy'
import { seedMembers } from '@/data/mock/seed/family'
import { seedAllergyNotes } from '@/data/mock/seed/journal'

describe('allergy rules', () => {
  it('labels Mia neutrally as "Mia: egg"', () => {
    const mia = seedMembers().find((m) => m.name === 'Mia')!
    expect(allergyBadgeLabel(mia)).toBe('Mia: egg')
  })

  it('only members with allergies get a badge', () => {
    const names = membersWithAllergies(seedMembers()).map((m) => m.name)
    expect(names).toEqual(['Mia'])
    expect(allergyBadgeLabel(seedMembers()[0]!)).toBeNull()
  })

  it('always prompts to confirm again', () => {
    expect(CONFIRM_PROMPT).toMatch(/confirm with the restaurant again/i)
  })

  it('never makes safety claims in app copy or seed notes', () => {
    const copy = [CONFIRM_PROMPT, NOTES_DISCLAIMER, ...seedAllergyNotes().map((n) => n.note)]
    for (const text of copy) {
      for (const banned of FORBIDDEN_SAFETY_CLAIMS) expect(text).not.toMatch(banned)
    }
  })
})
