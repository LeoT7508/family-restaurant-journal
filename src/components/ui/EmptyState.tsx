import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Icon, type IconName } from './Icon'

interface EmptyStateProps {
  icon?: IconName
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({
  icon = 'sparkle',
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-line px-6 py-10 text-center',
        className,
      )}
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent">
        <Icon name={icon} size={28} />
      </span>
      <h2 className="text-lg">{title}</h2>
      {description && <p className="max-w-sm text-ink-muted">{description}</p>}
      {action && <div className="pt-1">{action}</div>}
    </div>
  )
}
