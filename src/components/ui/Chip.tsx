import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'
import { Icon } from './Icon'

interface ChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  /** When set, the chip is a toggle button. */
  selected?: boolean
  /** Shows an × and calls this when pressed (for removable tags). */
  onRemove?: () => void
}

/** A toggle (filter) chip, or a removable tag when `onRemove` is given. */
export function Chip({ selected, onRemove, className, children, onClick, ...rest }: ChipProps) {
  const isToggle = selected !== undefined
  return (
    <button
      type="button"
      aria-pressed={isToggle ? selected : undefined}
      onClick={onRemove ?? onClick}
      aria-label={onRemove && typeof children === 'string' ? `Remove ${children}` : undefined}
      className={cn(
        'inline-flex min-h-9 items-center gap-1.5 rounded-full border-2 px-3.5 text-sm font-medium transition-colors',
        selected
          ? 'border-accent bg-accent-soft text-accent'
          : 'border-line bg-surface text-ink hover:bg-surface-2',
        className,
      )}
      {...rest}
    >
      {isToggle && selected && <Icon name="check" size={16} />}
      {children}
      {onRemove && <Icon name="x" size={16} />}
    </button>
  )
}
