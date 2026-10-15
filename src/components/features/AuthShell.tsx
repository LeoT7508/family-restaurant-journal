import type { ReactNode } from 'react'

/** The centered page that wraps every sign-in and setup screen. */
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: ReactNode
  children: ReactNode
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-gutter py-10">
      <div>
        <p className="text-lg font-semibold text-accent">Family Table</p>
        <h1 className="mt-1 text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-ink-muted">{subtitle}</p>}
      </div>
      {children}
    </main>
  )
}
