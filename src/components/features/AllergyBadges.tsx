import { Badge } from '@/components/ui'
import { allergyBadgeLabel, membersWithAllergies } from '@/lib/allergy'
import { useMembers } from '@/hooks/queries'

/**
 * A calm, neutral badge such as "Mia: egg". Deliberately not red or alarming,
 * and it never claims anything is safe.
 */
export function AllergyBadges() {
  const members = useMembers()
  const withAllergies = membersWithAllergies(members.data ?? [])
  if (withAllergies.length === 0) return null
  return (
    <>
      {withAllergies.map((m) => (
        <Badge key={m.id} tone="calm" icon="info">
          {allergyBadgeLabel(m)}
        </Badge>
      ))}
    </>
  )
}
