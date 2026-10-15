import { cn } from '@/lib/cn'

export type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type Size = 'md' | 'lg'

export const buttonStyles = (variant: Variant = 'primary', size: Size = 'md', fullWidth = false) =>
  cn(
    'inline-flex select-none whitespace-nowrap items-center justify-center gap-2 rounded-full font-medium transition-colors',
    'disabled:cursor-not-allowed disabled:opacity-55',
    // Heights match the Figma Button component: Md 36px, Lg 44px.
    size === 'md' && 'min-h-9 px-4 text-base',
    size === 'lg' && 'min-h-11 px-6 text-lg',
    fullWidth && 'w-full',
    // Deep teal, matching the Figma Button component (color/accent-strong).
    variant === 'primary' && 'bg-accent-strong text-canvas shadow-card hover:bg-accent',
    variant === 'secondary' &&
      'border-2 border-accent-strong bg-transparent text-accent-strong hover:bg-accent-soft',
    variant === 'ghost' && 'text-accent-strong hover:bg-accent-soft',
    variant === 'danger' && 'bg-danger text-accent-ink hover:opacity-90',
  )
