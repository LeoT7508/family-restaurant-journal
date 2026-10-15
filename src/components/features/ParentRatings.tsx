import { Rating } from '@/components/ui'
import type { FamilyMember } from '@/types'

interface ParentRatingsProps {
  parents: FamilyMember[]
  ratings: Record<string, number>
  /** When given, each parent's rating is editable. */
  onChange?: (memberId: string, value: number | undefined) => void
  size?: number
}

/** Each parent's own rating on its own row, so the two opinions are never blended. */
export function ParentRatings({ parents, ratings, onChange, size = 24 }: ParentRatingsProps) {
  return (
    <ul className="flex flex-col gap-1">
      {parents.map((p) => (
        <li key={p.id} className="flex items-center justify-between gap-3">
          <span className="w-20 shrink-0 font-medium">{p.name}</span>
          <Rating
            label={`${p.name}'s rating`}
            value={ratings[p.id]}
            onChange={onChange ? (v) => onChange(p.id, v) : undefined}
            size={size}
          />
        </li>
      ))}
    </ul>
  )
}
