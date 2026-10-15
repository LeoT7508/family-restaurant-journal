import { cn } from '@/lib/cn'
import { Icon } from './Icon'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
}

interface SegmentedProps<T extends string> {
  label: string
  options: SegmentedOption<T>[]
  value: T | undefined
  onChange: (value: T) => void
  className?: string
}

/** A single-choice button group (radio group). The chosen option shows a check mark. */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('flex flex-wrap gap-2', className)}>
      {options.map((o) => {
        const checked = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={() => onChange(o.value)}
            className={cn(
              'inline-flex min-h-9 items-center gap-1.5 rounded-full border-2 px-3.5 text-sm font-medium transition-colors',
              checked
                ? 'border-accent bg-accent-soft text-accent'
                : 'border-line bg-surface text-ink hover:bg-surface-2',
            )}
          >
            {checked && <Icon name="check" size={16} />}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
