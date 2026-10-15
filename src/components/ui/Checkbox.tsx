import { forwardRef, useId, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'
import { Icon } from './Icon'

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
}

/** A large, labelled checkbox. The check mark shows state, not just color. */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, className, id, ...rest },
  ref,
) {
  const autoId = useId()
  const fieldId = id ?? autoId
  return (
    <label
      htmlFor={fieldId}
      className={cn(
        'flex min-h-touch cursor-pointer items-center gap-3 rounded-md border-2 border-line bg-surface px-3 font-medium',
        'has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent',
        className,
      )}
    >
      <input ref={ref} id={fieldId} type="checkbox" className="peer sr-only" {...rest} />
      <span
        aria-hidden="true"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border-2 border-ink-muted text-transparent peer-checked:border-accent peer-checked:bg-accent peer-checked:text-accent-ink"
      >
        <Icon name="check" size={16} />
      </span>
      {label}
    </label>
  )
})
