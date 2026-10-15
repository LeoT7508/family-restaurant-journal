import { Link, NavLink, Outlet } from 'react-router-dom'
import { useHousehold } from '@/hooks/queries'
import { Icon } from '@/components/ui'
import { cn } from '@/lib/cn'
import { EXTRA_ITEMS, TAB_ITEMS, type NavItem } from './nav'
import { SignOutButton } from './SignOutButton'
import { UserSwitcher } from './UserSwitcher'

const linkBase = 'flex items-center gap-3 rounded-md px-3 font-medium transition-colors min-h-touch'

function SideLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      className={({ isActive }) =>
        cn(linkBase, isActive ? 'bg-accent-soft text-accent' : 'text-ink hover:bg-surface-2')
      }
    >
      <Icon name={item.icon} />
      {item.label}
    </NavLink>
  )
}

function BottomTab({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      className={({ isActive }) =>
        cn(
          'flex min-h-touch flex-1 flex-col items-center justify-center gap-0.5 rounded-md text-xs font-medium',
          isActive ? 'text-accent' : 'text-ink-muted',
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              'flex h-7 w-14 items-center justify-center rounded-full transition-colors',
              isActive && 'bg-accent-soft',
            )}
          >
            <Icon name={item.icon} size={22} filled={isActive && item.icon === 'heart'} />
          </span>
          <span>{item.label}</span>
        </>
      )}
    </NavLink>
  )
}

export function AppShell() {
  const household = useHousehold()
  const travel = household.data?.travel
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16.5rem_minmax(0,1fr)]">
      <a
        href="#main"
        className="sr-only-focusable absolute left-2 top-2 z-[70] rounded-md bg-surface px-3 py-2 font-medium"
      >
        Skip to content
      </a>

      {/* Laptop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-r border-line bg-surface px-4 py-6 lg:flex">
        <div className="px-1">
          <p className="text-xl font-semibold leading-tight text-accent">Family Table</p>
          <p className="text-sm text-ink-muted">Our restaurant journal</p>
        </div>
        <nav aria-label="Main" className="flex flex-col gap-1">
          {TAB_ITEMS.map((item) => (
            <SideLink key={item.to} item={item} />
          ))}
          <hr className="my-2 border-line" />
          {EXTRA_ITEMS.map((item) => (
            <SideLink key={item.to} item={item} />
          ))}
        </nav>
        <div className="mt-auto">
          <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-ink-muted">
            Logging as
          </p>
          <UserSwitcher />
          <div className="mt-2">
            <SignOutButton />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        {/* Phone / tablet header */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-canvas/95 px-gutter py-2 backdrop-blur lg:hidden">
          <p className="text-lg font-semibold text-accent">Family Table</p>
          <div className="flex items-center gap-1">
            <UserSwitcher />
            <SignOutButton iconOnly />
          </div>
        </header>

        <main
          id="main"
          tabIndex={-1}
          className="mx-auto w-full max-w-5xl flex-1 px-gutter pb-[calc(var(--bottom-nav-height)+2rem)] pt-5 md:px-8 lg:pb-12 lg:pt-8"
        >
          {travel && (
            <div
              role="status"
              className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-accent-soft px-4 py-2.5 text-sm text-accent"
            >
              <span className="flex items-center gap-2 font-medium">
                <Icon name="pin" size={18} /> Travel mode: {travel.destination}
              </span>
              <Link to="/profile#travel" className="font-medium underline underline-offset-4">
                Back home settings
              </Link>
            </div>
          )}
          <Outlet />
        </main>

        {/* Phone / tablet bottom tabs */}
        <nav
          aria-label="Main"
          className="pb-safe fixed inset-x-0 bottom-0 z-40 flex h-bottom-nav items-stretch gap-1 border-t border-line bg-surface px-2 lg:hidden"
        >
          {TAB_ITEMS.map((item) => (
            <BottomTab key={item.to} item={item} />
          ))}
        </nav>
      </div>
    </div>
  )
}
