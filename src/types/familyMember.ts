import { z } from 'zod'
import { baseRecordShape } from './common'

export const memberRoleSchema = z.enum(['parent', 'child'])
export type MemberRole = z.infer<typeof memberRoleSchema>

export const familyMemberSchema = z.object({
  ...baseRecordShape,
  name: z.string().min(1, 'Name is required'),
  role: memberRoleSchema,
  /** Children only. */
  age: z.number().int().min(0).max(25).optional(),
  allergies: z.array(z.string().min(1)),
  isParent: z.boolean(),
})
export type FamilyMember = z.infer<typeof familyMemberSchema>

export const familyMemberFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required'),
    role: memberRoleSchema,
    age: z.number().int().min(0, 'Age must be 0 or more').max(25).optional(),
    allergies: z.array(z.string().min(1)),
  })
  .refine((v) => v.role === 'parent' || v.age !== undefined, {
    path: ['age'],
    message: 'Add an age for children',
  })
export type FamilyMemberFormValues = z.infer<typeof familyMemberFormSchema>
