import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds hover/pressed styling for cards that are (or contain) a link. */
  interactive?: boolean
}

export function Card({ interactive, className, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-line bg-surface p-4 shadow-card',
        interactive && 'transition-shadow hover:shadow-raised',
        className,
      )}
      {...rest}
    />
  )
}
