import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface TabItem<T extends string> {
  value: T
  label: string
}

interface TabsProps<T extends string> {
  label: string
  items: TabItem<T>[]
  value: T
  onChange: (value: T) => void
  /** Render the panel for the current tab. */
  children?: ReactNode
  className?: string
}

/** Accessible tabs: arrow keys move between tabs, Home/End jump to the ends. */
export function Tabs<T extends string>({
  label,
  items,
  value,
  onChange,
  children,
  className,
}: TabsProps<T>) {
  const baseId = useId()
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const last = items.length - 1
    const targets: Record<string, number> = {
      ArrowRight: index === last ? 0 : index + 1,
      ArrowLeft: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    }
    const next = targets[event.key]
    if (next === undefined) return
    event.preventDefault()
    const item = items[next]
    if (item) {
      onChange(item.value)
      refs.current[next]?.focus()
    }
  }

  return (
    <div className={className}>
      <div role="tablist" aria-label={label} className="flex gap-1 rounded-lg bg-surface-2 p-1">
        {items.map((item, index) => {
          const selected = item.value === value
          return (
            <button
              key={item.value}
              ref={(el) => {
                refs.current[index] = el
              }}
              role="tab"
              type="button"
              id={`${baseId}-tab-${item.value}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(item.value)}
              onKeyDown={(e) => onKeyDown(e, index)}
              className={cn(
                'min-h-8 flex-1 rounded-md px-3 text-sm font-medium transition-colors',
                selected ? 'bg-surface text-ink shadow-card' : 'text-ink-muted hover:text-ink',
              )}
            >
              {item.label}
            </button>
          )
        })}
      </div>
      {children !== undefined && (
        <div
          role="tabpanel"
          id={`${baseId}-panel`}
          aria-labelledby={`${baseId}-tab-${value}`}
          className="pt-4"
        >
          {children}
        </div>
      )}
    </div>
  )
}
