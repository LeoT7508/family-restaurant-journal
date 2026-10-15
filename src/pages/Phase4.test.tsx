import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '@/test/renderApp'
import {
  MockFamilyRepository,
  MockRestaurantRepository,
  MockVisitRepository,
  MockWishlistRepository,
} from '@/data/mock/repositories'
import * as exportLib from '@/lib/export'

afterEach(() => {
  vi.restoreAllMocks()
  // @ts-expect-error test cleanup of the stub
  delete window.matchMedia
})

describe('share card (food only)', () => {
  it('previews a card with food info only', async () => {
    const user = userEvent.setup()
    renderApp('/visits/visit-lou')
    await user.click(await screen.findByRole('button', { name: 'Share' }))
    const card = await screen.findByRole('article', { name: /share card for lou malnati/i })
    expect(within(card).getByText('Chicago Classic deep dish')).toBeInTheDocument()
    expect(within(card).getByText("Kids' menu")).toBeInTheDocument()
    expect(card.textContent).not.toMatch(/mia|max|egg|allerg|alex|sam\b|ages?\b/i)
    expect(card.textContent).not.toContain('Buttery crust') // free-text notes stay private
    expect(screen.getByText(/never include allergy notes/i)).toBeInTheDocument()
  })

  it('refuses to build a card when the restaurant name mentions a family member', async () => {
    const user = userEvent.setup()
    await new MockRestaurantRepository().update('rest-lou-malnatis', {
      name: "Mia's favorite pizza",
    })
    renderApp('/visits/visit-lou')
    await user.click(await screen.findByRole('button', { name: 'Share' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/can't be shared/i)
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })
})

describe('visit and restaurant management', () => {
  it('deletes a visit after confirmation and returns to the journal', async () => {
    const user = userEvent.setup()
    renderApp('/visits/visit-pita')
    await user.click(await screen.findByRole('button', { name: /delete visit/i }))
    await user.click(screen.getByRole('button', { name: /yes, delete this visit/i }))
    await waitFor(async () => expect(await new MockVisitRepository().get('visit-pita')).toBeNull())
    expect(await screen.findByRole('heading', { name: 'Journal' })).toBeInTheDocument()
  })

  it('marks a restaurant closed, flags it, and stops suggesting it', async () => {
    const user = userEvent.setup()
    renderApp('/restaurants/rest-superdawg')
    await user.click(await screen.findByRole('button', { name: /mark as closed/i }))
    await waitFor(async () =>
      expect((await new MockRestaurantRepository().get('rest-superdawg'))?.status).toBe('closed'),
    )
    expect(await screen.findByRole('button', { name: /mark as open again/i })).toBeInTheDocument()
    expect(screen.getAllByText('Closed').length).toBeGreaterThan(0)
  })

  it('edits restaurant details', async () => {
    const user = userEvent.setup()
    renderApp('/restaurants/rest-pita-inn')
    await user.click(await screen.findByRole('button', { name: /edit details/i }))
    const dialog = await screen.findByRole('dialog')
    const name = within(dialog).getByLabelText('Name')
    await user.clear(name)
    await user.type(name, 'Pita Inn Skokie')
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(async () =>
      expect((await new MockRestaurantRepository().get('rest-pita-inn'))?.name).toBe(
        'Pita Inn Skokie',
      ),
    )
  })

  it('merges a duplicate into another restaurant', async () => {
    const user = userEvent.setup()
    renderApp('/restaurants/rest-superdawg')
    await user.click(await screen.findByRole('button', { name: /merge duplicate/i }))
    const dialog = await screen.findByRole('dialog')
    await user.selectOptions(within(dialog).getByLabelText(/merge into/i), 'rest-lou-malnatis')
    expect(await within(dialog).findByText(/this moves 1 visit/i)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Merge' }))
    await waitFor(async () => {
      expect(await new MockRestaurantRepository().get('rest-superdawg')).toBeNull()
      const visits = await new MockVisitRepository().listByRestaurant('rest-lou-malnatis')
      expect(visits).toHaveLength(2)
    })
  })

  it('deletes a restaurant only after showing what goes with it', async () => {
    const user = userEvent.setup()
    renderApp('/restaurants/rest-pita-inn')
    await user.click(await screen.findByRole('button', { name: /^delete$/i }))
    const dialog = await screen.findByRole('dialog')
    expect(
      await within(dialog).findByText(/1 visit, 2 dishes, 1 allergy note/i),
    ).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: /yes, delete it/i }))
    await waitFor(async () =>
      expect(await new MockRestaurantRepository().get('rest-pita-inn')).toBeNull(),
    )
  })

  it('edits a wishlist note', async () => {
    const user = userEvent.setup()
    renderApp('/wishlist')
    await user.click(await screen.findByRole('button', { name: /edit note for smak-tak/i }))
    const dialog = await screen.findByRole('dialog')
    const note = within(dialog).getByLabelText(/why this one/i)
    await user.clear(note)
    await user.type(note, 'Go for the pierogi')
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(async () => {
      const items = await new MockWishlistRepository().list()
      expect(items.find((i) => i.restaurantId === 'rest-smak-tak')?.note).toBe('Go for the pierogi')
    })
  })
})

describe('year in review', () => {
  it('summarizes the year', async () => {
    renderApp('/year')
    expect(await screen.findByRole('heading', { name: 'Year in review' })).toBeInTheDocument()
    const stats = await screen.findByText('Visits')
    expect(stats.parentElement).toHaveTextContent('6')
    expect(screen.getByText('$591.60')).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Visits by month' })).toBeInTheDocument()
    expect(
      within(screen.getByRole('list', { name: 'Top rated restaurants' })).getAllByRole(
        'listitem',
      )[0],
    ).toHaveTextContent("Cooper's Hawk")
  })

  it('has a friendly empty state', async () => {
    localStorage.setItem('frj.v1.visits', '[]')
    renderApp('/year')
    expect(await screen.findByText(/nothing to review yet/i)).toBeInTheDocument()
  })
})

describe('profile: home, travel, export, sync', () => {
  it('edits home base and validates the ZIP code', async () => {
    const user = userEvent.setup()
    renderApp('/profile')
    await user.click(await screen.findByRole('button', { name: /^edit$/i }))
    const dialog = await screen.findByRole('dialog', { name: /home base/i })
    const zip = within(dialog).getByLabelText(/zip code/i)
    await user.clear(zip)
    await user.type(zip, '606')
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))
    expect(await within(dialog).findByText(/5-digit zip/i)).toBeInTheDocument()
    await user.clear(zip)
    await user.type(zip, '60634')
    const radius = within(dialog).getByLabelText(/drive-time radius/i)
    await user.clear(radius)
    await user.type(radius, '25')
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(async () => {
      const h = await new MockFamilyRepository().getHousehold()
      expect(h.homeZip).toBe('60634')
      expect(h.driveRadiusMinutes).toBe(25)
    })
  })

  it('turns travel mode on and off, with a banner while it is on', async () => {
    const user = userEvent.setup()
    renderApp('/profile')
    await user.type(await screen.findByLabelText(/where are you going/i), 'Orlando, FL')
    await user.click(screen.getByRole('button', { name: /start travel mode/i }))
    await waitFor(async () =>
      expect((await new MockFamilyRepository().getHousehold()).travel?.destination).toBe(
        'Orlando, FL',
      ),
    )
    expect((await screen.findAllByText(/travel mode: orlando, fl/i)).length).toBeGreaterThan(0)
    await user.click(screen.getByRole('button', { name: /back home/i }))
    await waitFor(async () =>
      expect((await new MockFamilyRepository().getHousehold()).travel).toBeUndefined(),
    )
    await waitFor(() => expect(screen.queryByText(/travel mode: orlando/i)).not.toBeInTheDocument())
  })

  it('downloads the spreadsheet and the full backup', async () => {
    const user = userEvent.setup()
    const download = vi.spyOn(exportLib, 'downloadText').mockImplementation(() => {})
    renderApp('/profile')
    await user.click(await screen.findByRole('button', { name: /spreadsheet \(csv\)/i }))
    await waitFor(() => expect(download).toHaveBeenCalledTimes(1))
    expect(download.mock.calls[0]![0]).toMatch(/\.csv$/)
    expect(download.mock.calls[0]![1]).toContain("Lou Malnati's Pizzeria")
    await user.click(screen.getByRole('button', { name: /full backup \(json\)/i }))
    await waitFor(() => expect(download).toHaveBeenCalledTimes(2))
    const backup = JSON.parse(download.mock.calls[1]![1] as string)
    expect(backup.allergyNotes.length).toBeGreaterThan(0)
    expect(backup.visits.length).toBe(7)
  })

  it('reports records that exist only on this device', async () => {
    renderApp('/profile')
    expect(await screen.findByText(/everything is in sync/i)).toBeInTheDocument()
    await new MockVisitRepository().create({
      restaurantId: 'rest-pita-inn',
      date: '2026-10-01',
      loggedBy: 'sam',
      occasions: [],
      ratings: {},
      notes: '',
      photos: [],
      isDraft: true,
    })
    renderApp('/profile')
    expect(await screen.findByText(/1 record is saved only on this device/i)).toBeInTheDocument()
  })
})

describe('travel mode behavior', () => {
  it('saves a hand-added place as a trip place, and only trip places are suggested', async () => {
    const user = userEvent.setup()
    await new MockFamilyRepository().updateHousehold({ travel: { destination: 'Orlando' } })
    renderApp('/log')
    await user.click(
      await screen.findByRole('button', { name: /can't find it\? add it yourself/i }),
    )
    await user.type(screen.getByLabelText('Restaurant name'), 'Key West Shrimp House')
    await user.type(screen.getByLabelText('Cuisine'), 'Seafood')
    await user.click(screen.getByRole('button', { name: /use this place/i }))
    await user.click(screen.getByRole('radio', { name: '5 stars' }))
    await user.click(screen.getByRole('button', { name: /save draft/i }))
    await waitFor(async () => {
      const r = (await new MockRestaurantRepository().list()).find(
        (x) => x.name === 'Key West Shrimp House',
      )
      expect(r?.tags).toContain('trip:Orlando')
      expect(r?.driveMinutes).toBe(0)
    })

    cleanup() // unmount the first app so only one set of results is on screen
    renderApp('/tonight')
    await user.click(await screen.findByRole('button', { name: /find 3 places/i }))
    const heading = await screen.findByRole('heading', { name: /here is an idea/i })
    const names = within(heading.closest('section')!).getAllByRole('heading', { level: 3 })
    expect(names.map((n) => n.textContent)).toEqual(['Key West Shrimp House'])
    expect(
      within(screen.getByRole('list', { name: 'Why Key West Shrimp House' })).getByText(
        'On your Orlando trip',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText(/drive time from home is ignored/i)).toBeInTheDocument()
  })

  it('adds a place by hand at home with a drive time, and validates it', async () => {
    const user = userEvent.setup()
    renderApp('/log')
    await user.click(
      await screen.findByRole('button', { name: /can't find it\? add it yourself/i }),
    )
    await user.click(screen.getByRole('button', { name: /use this place/i }))
    expect(await screen.findByText(/add a name/i)).toBeInTheDocument()
    await user.type(screen.getByLabelText('Restaurant name'), 'Corner Bakery Cafe')
    await user.type(screen.getByLabelText('Cuisine'), 'Bakery')
    await user.clear(screen.getByLabelText(/drive time from home/i))
    await user.type(screen.getByLabelText(/drive time from home/i), '9')
    await user.click(screen.getByRole('button', { name: /use this place/i }))
    expect(await screen.findByRole('button', { name: /change restaurant/i })).toBeInTheDocument()
    expect(screen.getByText('9 min drive')).toBeInTheDocument()
  })

  it('the journal can show only trip places', async () => {
    await new MockRestaurantRepository().create({
      placeId: 'manual:x',
      name: 'Beach Shack',
      address: 'Orlando',
      cuisine: 'Seafood',
      priceLevel: 2,
      driveMinutes: 0,
      status: 'open',
      tags: ['trip:Orlando'],
    })
    const rest = (await new MockRestaurantRepository().list()).find(
      (r) => r.name === 'Beach Shack',
    )!
    await new MockVisitRepository().create({
      restaurantId: rest.id,
      date: '2026-09-01',
      loggedBy: 'sam',
      occasions: [],
      ratings: {},
      notes: '',
      photos: [],
      isDraft: false,
    })
    renderApp('/journal?where=Orlando')
    expect(await screen.findByText('Beach Shack')).toBeInTheDocument()
    expect(screen.getByText(/1 visit$/)).toBeInTheDocument()
    expect(screen.getByText('On trip: Orlando')).toBeInTheDocument()
  })
})

describe('journal two-pane on laptop', () => {
  const stubWide = (wide: boolean) => {
    window.matchMedia = ((query: string) => ({
      matches: wide && query.includes('1024'),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia
  }

  it('shows the selected visit beside the list', async () => {
    stubWide(true)
    renderApp('/journal/visit-lou')
    const pane = await screen.findByRole('complementary', { name: /selected visit/i })
    expect(
      await within(pane).findByRole('heading', { name: "Lou Malnati's Pizzeria", level: 1 }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: "Lou Malnati's Pizzeria" })[0]).toHaveAttribute(
      'href',
      '/journal/visit-lou',
    )
  })

  it('invites a choice when nothing is selected', async () => {
    stubWide(true)
    renderApp('/journal')
    const pane = await screen.findByRole('complementary', { name: /selected visit/i })
    expect(within(pane).getByText(/choose a visit/i)).toBeInTheDocument()
  })

  it('on smaller screens a visit opens as its own page', async () => {
    stubWide(false)
    renderApp('/journal/visit-lou')
    expect(
      await screen.findByRole('heading', { name: "Lou Malnati's Pizzeria", level: 1 }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('complementary', { name: /selected visit/i })).not.toBeInTheDocument()
  })
})
