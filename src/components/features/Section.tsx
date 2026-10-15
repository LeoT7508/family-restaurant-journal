import { useId, type ReactNode } from 'react'

/** A titled block of a page, with an optional action (such as an Add button) on the right. */
export function Section({
  title,
  action,
  hint,
  children,
}: {
  title: string
  action?: ReactNode
  hint?: string
  children: ReactNode
}) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id={id} className="text-xl">
          {title}
        </h2>
        {action}
      </div>
      {hint && <p className="-mt-1 text-sm text-ink-muted">{hint}</p>}
      {children}
    </section>
  )
}
