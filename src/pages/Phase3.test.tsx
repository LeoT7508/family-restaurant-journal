import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '@/test/renderApp'
import { MockVisitRepository, MockWishlistRepository } from '@/data/mock/repositories'
import { FORBIDDEN_SAFETY_CLAIMS } from '@/lib/allergy'
import { PlaceholderMap } from '@/components/features/PlaceholderMap'
import type { MapMarker } from '@/services/MapView'

const noSafetyClaims = () => {
  for (const banned of FORBIDDEN_SAFETY_CLAIMS)
    expect(document.body.textContent).not.toMatch(banned)
}

describe('Where tonight?', () => {
  it('asks three questions and returns three ideas with reasons', async () => {
    const user = userEvent.setup()
    renderApp('/tonight')
    expect(await screen.findByText(/1\. What are you in the mood for/)).toBeInTheDocument()
    expect(screen.getByText(/2\. How far/)).toBeInTheDocument()
    expect(screen.getByText(/3\. Anything to keep in mind/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /find 3 places/i }))
    const heading = await screen.findByRole('heading', { name: /here are 3 ideas/i })
    const section = heading.closest('section')!
    expect(within(section).getAllByRole('heading', { level: 3 })).toHaveLength(3)
    expect(within(section).getAllByText(/min away/).length).toBe(3)
    noSafetyClaims()
  })

  it('starts the drive-time answer at the household radius', async () => {
    renderApp('/tonight')
    const twenty = await screen.findByRole('radio', { name: '20 min' })
    await waitFor(() => expect(twenty).toHaveAttribute('aria-checked', 'true'))
  })

  it('fills from new places only when history runs short, and says so', async () => {
    const user = userEvent.setup()
    renderApp('/tonight')
    await user.click(await screen.findByRole('button', { name: 'Pizza' }))
    await user.click(screen.getByRole('button', { name: /find 3 places/i }))
    expect(
      await screen.findByText(/only 1 place in your journal or wishlist matched/i),
    ).toBeInTheDocument()
    expect(screen.getAllByText('New to you').length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: /add to wishlist/i }).length).toBeGreaterThan(0)
  })

  it('"Safe for Mia" uses notes only and keeps the confirm prompt', async () => {
    const user = userEvent.setup()
    renderApp('/tonight')
    await user.click(await screen.findByLabelText(/Safe for Mia \(from our notes\)/))
    expect(
      screen.getByText(/only places where your own notes say mia ate a dish fine/i),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /find 3 places/i }))
    await screen.findByRole('heading', { name: /here are 3 ideas/i })
    expect(screen.getAllByText(/confirm with the restaurant again/i).length).toBeGreaterThanOrEqual(
      3,
    )
    expect(screen.queryByText('New to you')).not.toBeInTheDocument()
    noSafetyClaims()
  })

  it('"Show me different ones" never repeats earlier picks', async () => {
    const user = userEvent.setup()
    renderApp('/tonight')
    await user.click(await screen.findByRole('button', { name: /find 3 places/i }))
    const names = async () => {
      const heading = await screen.findByRole('heading', { name: /here are \d ideas?/i })
      return within(heading.closest('section')!)
        .getAllByRole('heading', { level: 3 })
        .map((h) => h.textContent)
    }
    const first = await names()
    await user.click(screen.getByRole('button', { name: /show me different ones/i }))
    await waitFor(async () => expect(await names()).not.toEqual(first))
    expect((await names()).some((n) => first.includes(n))).toBe(false)
  })

  it('explains when nothing matches', async () => {
    const user = userEvent.setup()
    renderApp('/tonight')
    await user.click(await screen.findByRole('radio', { name: '10 min' }))
    await user.click(screen.getByRole('button', { name: 'Japanese' }))
    await user.click(screen.getByRole('button', { name: /find 3 places/i }))
    expect(await screen.findByText(/nothing matches all of that/i)).toBeInTheDocument()
  })
})

describe('wishlist', () => {
  it('lists shared items with who added them', async () => {
    renderApp('/wishlist')
    expect(await screen.findByText('Smak-Tak')).toBeInTheDocument()
    expect(screen.getByText(/pierogi/i)).toBeInTheDocument()
    expect(screen.getAllByText(/added by (sam|alex)/i)).toHaveLength(3)
  })

  it('adds a place from search, attributed to the current parent, without duplicates', async () => {
    const user = userEvent.setup()
    renderApp('/wishlist')
    await user.click(await screen.findByRole('button', { name: /^add place$/i }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText(/where did you eat/i), 'portillo')
    const results = await within(dialog).findByRole('list', { name: /restaurant results/i })
    await user.click(await within(results).findByRole('button', { name: /portillo/i }))
    await user.type(within(dialog).getByLabelText(/why this one/i), 'Italian beef!')
    await user.click(within(dialog).getByRole('button', { name: /add to wishlist/i }))
    await waitFor(async () => {
      const items = await new MockWishlistRepository().list()
      const added = items.find((i) => i.note === 'Italian beef!')
      expect(added?.addedBy).toBe('alex')
      expect(items).toHaveLength(4)
    })
    expect(await screen.findByText("Portillo's")).toBeInTheDocument()
  })

  it('removes an item after confirmation', async () => {
    const user = userEvent.setup()
    renderApp('/wishlist')
    await user.click(await screen.findByRole('button', { name: /remove smak-tak/i }))
    await user.click(screen.getByRole('button', { name: /yes, remove/i }))
    await waitFor(async () => expect(await new MockWishlistRepository().list()).toHaveLength(2))
    await waitFor(() => expect(screen.queryByText('Smak-Tak')).not.toBeInTheDocument())
  })

  it('"Mark as visited" opens the log with the restaurant filled in and clears the item on save', async () => {
    const user = userEvent.setup()
    renderApp('/wishlist')
    await user.click((await screen.findAllByRole('link', { name: /mark as visited/i }))[0]!)
    expect(await screen.findByRole('button', { name: /change restaurant/i })).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: '5 stars' }))
    await user.click(screen.getByRole('button', { name: /save draft/i }))
    await waitFor(async () => {
      expect(await new MockWishlistRepository().list()).toHaveLength(2)
      const visits = await new MockVisitRepository().list()
      expect(
        visits.some((v) => v.familyRating === 5 && v.isDraft && v.syncStatus === 'local'),
      ).toBe(true)
    })
  })

  it('leaving the log without saving keeps the wishlist item', async () => {
    const user = userEvent.setup()
    renderApp('/wishlist')
    await user.click((await screen.findAllByRole('link', { name: /mark as visited/i }))[0]!)
    await screen.findByRole('button', { name: /change restaurant/i })
    expect(await new MockWishlistRepository().list()).toHaveLength(3)
  })
})

describe('map', () => {
  it('shows visited and wishlist places as pins and in a list', async () => {
    const user = userEvent.setup()
    renderApp('/map')
    expect(
      await screen.findByRole('button', { name: /Smak-Tak, 13 minutes away, on the wishlist/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Pita Inn, 17 minutes away, visited$/ }),
    ).toBeInTheDocument()
    expect(screen.getByText(/placeholder map/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Wishlist' }))
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /Pita Inn, 17/ })).not.toBeInTheDocument(),
    )
    expect(screen.getByRole('button', { name: /Smak-Tak, 13 minutes away/ })).toBeInTheDocument()
  })

  it('selecting a pin shows its details', async () => {
    const user = userEvent.setup()
    renderApp('/map')
    await user.click(await screen.findByRole('button', { name: /Smak-Tak, 13 minutes away/ }))
    expect(await screen.findByRole('link', { name: /open details/i })).toHaveAttribute(
      'href',
      '/restaurants/rest-smak-tak',
    )
  })
})

describe('PlaceholderMap (the swappable MapView contract)', () => {
  const markers: MapMarker[] = [
    { id: 'a', name: 'Alpha', driveMinutes: 5, kind: 'visited' },
    { id: 'b', name: 'Beta', driveMinutes: 25, kind: 'wishlist' },
    { id: 'c', name: 'Gamma', driveMinutes: 12, kind: 'both' },
  ]

  it('renders one keyboard-operable pin per marker and reports selection', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(
      <PlaceholderMap
        markers={markers}
        selectedId={null}
        onSelect={onSelect}
        homeLabel="Home"
        radiusMinutes={20}
      />,
    )
    const pins = screen.getAllByRole('button')
    expect(pins).toHaveLength(3)
    pins[1]!.focus()
    await user.keyboard('{Enter}')
    expect(onSelect).toHaveBeenCalledWith('b')
    expect(
      screen.getByRole('button', { name: /Gamma.*visited and on the wishlist/ }),
    ).toBeInTheDocument()
  })

  it('places pins by drive time, so farther places sit farther from home', () => {
    const { container } = render(
      <PlaceholderMap
        markers={markers}
        selectedId={null}
        onSelect={() => {}}
        homeLabel="Home"
        radiusMinutes={20}
      />,
    )
    const dist = (name: string) => {
      const g = screen.getByRole('button', { name: new RegExp(name) })
      const c = g.querySelector('circle:not(.halo), rect')!
      const x = Number(c.getAttribute('cx') ?? Number(c.getAttribute('x')) + 8)
      const y = Number(c.getAttribute('cy') ?? Number(c.getAttribute('y')) + 8)
      return Math.hypot(x - 200, y - 200)
    }
    expect(dist('Alpha')).toBeLessThan(dist('Gamma'))
    expect(dist('Gamma')).toBeLessThan(dist('Beta'))
    expect(container.querySelector('svg')).toBeTruthy()
  })
})

describe('home ideas', () => {
  it('suggests places from history without mixing in new ones', async () => {
    renderApp('/')
    expect(
      await screen.findByRole('heading', { name: /ideas from your history/i }),
    ).toBeInTheDocument()
    const section = screen
      .getByRole('heading', { name: /ideas from your history/i })
      .closest('section')!
    expect(within(section).queryByText('New to you')).not.toBeInTheDocument()
    expect(within(section).getAllByRole('heading', { level: 3 }).length).toBeGreaterThan(0)
  })
})
