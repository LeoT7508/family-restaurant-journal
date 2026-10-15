import { useId, useRef, type KeyboardEvent } from 'react'
import { cn } from '@/lib/cn'
import { Icon } from './Icon'

interface RatingProps {
  /** Describes what is being rated, e.g. "Family rating". */
  label: string
  value?: number
  /** When given, the rating is editable. */
  onChange?: (value: number | undefined) => void
  size?: number
  className?: string
}

const STARS = [1, 2, 3, 4, 5]

export function Rating({ label, value, onChange, size = 28, className }: RatingProps) {
  const groupId = useId()
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  if (!onChange) {
    return (
      <span
        role="img"
        aria-label={value ? `${label}: ${value} out of 5` : `${label}: not rated`}
        className={cn('inline-flex items-center gap-0.5 text-highlight', className)}
      >
        {STARS.map((n) => (
          <Icon key={n} name="star" size={size} filled={!!value && n <= value} />
        ))}
      </span>
    )
  }

  const onKeyDown = (event: KeyboardEvent, n: number) => {
    const step = ['ArrowRight', 'ArrowUp'].includes(event.key)
      ? 1
      : ['ArrowLeft', 'ArrowDown'].includes(event.key)
        ? -1
        : 0
    if (step === 0) return
    event.preventDefault()
    const next = Math.min(5, Math.max(1, n + step))
    onChange(next)
    refs.current[next - 1]?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      id={groupId}
      className={cn('inline-flex items-center', className)}
    >
      {STARS.map((n) => {
        const checked = value === n
        return (
          <button
            key={n}
            ref={(el) => {
              refs.current[n - 1] = el
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={`${n} ${n === 1 ? 'star' : 'stars'}`}
            tabIndex={checked || (value === undefined && n === 1) ? 0 : -1}
            onClick={() => onChange(checked ? undefined : n)}
            onKeyDown={(e) => onKeyDown(e, n)}
            className="flex h-touch w-touch items-center justify-center rounded-full text-highlight"
          >
            <Icon name="star" size={size} filled={!!value && n <= value} />
          </button>
        )
      })}
    </div>
  )
}
