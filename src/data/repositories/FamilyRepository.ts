import type { FamilyMember, Household, NewRecord } from '@/types'

export interface FamilyRepository {
  getHousehold(): Promise<Household>
  updateHousehold(patch: Partial<NewRecord<Household>>): Promise<Household>
  listMembers(): Promise<FamilyMember[]>
  getMember(id: string): Promise<FamilyMember | null>
  createMember(input: NewRecord<FamilyMember>): Promise<FamilyMember>
  updateMember(id: string, patch: Partial<NewRecord<FamilyMember>>): Promise<FamilyMember>
  removeMember(id: string): Promise<void>
}
