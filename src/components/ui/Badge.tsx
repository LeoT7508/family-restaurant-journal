import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'
import { Icon, type IconName } from './Icon'

export type BadgeTone = 'neutral' | 'accent' | 'sage' | 'highlight' | 'calm' | 'success'

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-surface-2 text-ink-muted',
  accent: 'bg-accent-soft text-accent',
  sage: 'bg-sage-soft text-sage',
  highlight: 'bg-highlight-soft text-ink',
  calm: 'bg-calm-soft text-calm',
  success: 'bg-success-soft text-success',
}

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
  icon?: IconName
}

/** Always carries text (and optionally an icon), so meaning never depends on color alone. */
export function Badge({ tone = 'neutral', icon, className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
        tones[tone],
        className,
      )}
      {...rest}
    >
      {icon && <Icon name={icon} size={14} />}
      {children}
    </span>
  )
}
