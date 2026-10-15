import { Button } from './Button'
import { Icon } from './Icon'

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
}

/** Calm error panel. Uses an icon and words, not just red. */
export function ErrorState({
  title = "That didn't load",
  message = 'Something went wrong. Please try again.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-lg border border-line bg-surface px-6 py-10 text-center"
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-danger-soft text-danger">
        <Icon name="alert" size={28} />
      </span>
      <h2 className="text-lg">{title}</h2>
      <p className="max-w-sm text-ink-muted">{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}
