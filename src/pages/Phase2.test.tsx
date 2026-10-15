import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '@/test/renderApp'
import {
  MockAllergyRepository,
  MockDishRepository,
  MockVisitRepository,
  MockWineRepository,
} from '@/data/mock/repositories'
import { FORBIDDEN_SAFETY_CLAIMS } from '@/lib/allergy'
import { todayISO } from '@/lib/format'

const noSafetyClaims = () => {
  for (const banned of FORBIDDEN_SAFETY_CLAIMS)
    expect(document.body.textContent).not.toMatch(banned)
}

describe('visit detail', () => {
  it('shows both parents’ ratings separately, dishes, kid info and dated allergy notes', async () => {
    renderApp('/visits/visit-lou')
    expect(
      await screen.findByRole('heading', { name: "Lou Malnati's Pizzeria" }),
    ).toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: "Alex's rating" })).toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: "Sam's rating" })).toBeInTheDocument()
    const alex = screen.getByRole('radiogroup', { name: "Alex's rating" })
    expect(within(alex).getByRole('radio', { name: '5 stars', checked: true })).toBeInTheDocument()
    const sam = screen.getByRole('radiogroup', { name: "Sam's rating" })
    expect(within(sam).getByRole('radio', { name: '4 stars', checked: true })).toBeInTheDocument()
    expect(await screen.findByText('Chicago Classic deep dish')).toBeInTheDocument()
    expect(screen.getByText(/Kids' menu/)).toBeInTheDocument()
    expect(screen.getByText(/Sep 27, 2026/, { selector: 'span' })).toBeInTheDocument()
    expect(screen.getAllByText(/confirm with the restaurant again/i).length).toBeGreaterThan(0)
    noSafetyClaims()
  })

  it('changes one parent’s rating without touching the other', async () => {
    const user = userEvent.setup()
    renderApp('/visits/visit-lou')
    const sam = await screen.findByRole('radiogroup', { name: "Sam's rating" })
    await user.click(within(sam).getByRole('radio', { name: '2 stars' }))
    await waitFor(async () => {
      const v = await new MockVisitRepository().get('visit-lou')
      expect(v?.ratings).toEqual({ alex: 5, sam: 2 })
    })
  })

  it('saves go-again and occasion', async () => {
    const user = userEvent.setup()
    renderApp('/visits/visit-lou')
    await user.click(await screen.findByRole('radio', { name: 'Maybe' }))
    await user.click(screen.getByRole('button', { name: 'Birthday' }))
    await waitFor(async () => {
      const v = await new MockVisitRepository().get('visit-lou')
      expect(v?.goAgain).toBe('maybe')
      expect(v?.occasions).toContain('Birthday')
    })
  })

  it('adds a dish with per-person verdicts and a note for Mia', async () => {
    const user = userEvent.setup()
    renderApp('/visits/visit-lou')
    await user.click(await screen.findByRole('button', { name: /add dish/i }))
    const dialog = await screen.findByRole('dialog', { name: /add a dish/i })
    await user.type(within(dialog).getByLabelText('Dish'), 'Garlic bread')
    await user.click(within(dialog).getByRole('button', { name: 'Max' }))
    await user.click(within(dialog).getByRole('button', { name: 'Mia' }))
    const maxVerdict = within(dialog).getByRole('radiogroup', { name: "Max's verdict" })
    await user.click(within(maxVerdict).getByRole('radio', { name: 'Loved it' }))
    await user.click(within(dialog).getByRole('radio', { name: 'Ate it fine' }))
    await user.click(within(dialog).getByRole('button', { name: /save dish/i }))
    await waitFor(async () => {
      const dishes = await new MockDishRepository().listByVisit('visit-lou')
      const dish = dishes.find((d) => d.name === 'Garlic bread')
      expect(dish).toBeDefined()
      expect(dish?.eatenBy.sort()).toEqual(['max', 'mia'])
      expect(dish?.safeForAllergy).toBe('safe')
      expect(dish?.syncStatus).toBe('local')
    })
    expect(await screen.findByText('Garlic bread')).toBeInTheDocument()
    expect(screen.getAllByText(/Mia ate it fine \(our note\)/).length).toBeGreaterThan(0)
    noSafetyClaims()
  })

  it('requires a dish name', async () => {
    const user = userEvent.setup()
    renderApp('/visits/visit-lou')
    await user.click(await screen.findByRole('button', { name: /add dish/i }))
    await user.click(await screen.findByRole('button', { name: /save dish/i }))
    expect(await screen.findByText(/what was it called/i)).toBeInTheDocument()
  })

  it('adds an allergy note stamped with today’s date', async () => {
    const user = userEvent.setup()
    renderApp('/visits/visit-lou')
    await user.click(await screen.findByRole('button', { name: /add note/i }))
    const dialog = await screen.findByRole('dialog')
    await user.type(
      within(dialog).getByLabelText(/what did they say/i),
      'No egg in the garlic bread',
    )
    await user.type(within(dialog).getByLabelText(/who did you ask/i), 'Manager')
    await user.click(within(dialog).getByRole('button', { name: /save note/i }))
    await waitFor(async () => {
      const notes = await new MockAllergyRepository().listByRestaurant('rest-lou-malnatis')
      const note = notes.find((n) => n.note.includes('garlic bread'))
      expect(note?.dateAsked).toBe(todayISO())
      expect(note?.memberId).toBe('mia')
    })
    expect(await screen.findByText(/no egg in the garlic bread/i)).toBeInTheDocument()
    noSafetyClaims()
  })

  it('shows cost per person while editing the price', async () => {
    const user = userEvent.setup()
    renderApp('/visits/visit-chipotle')
    const price = await screen.findByRole('region', { name: 'Price' })
    await user.click(within(price).getByRole('button', { name: /add/i }))
    const dialog = await screen.findByRole('dialog', { name: 'Price' })
    await user.type(within(dialog).getByLabelText(/total spent/i), '100')
    await user.type(within(dialog).getByLabelText(/people at the table/i), '4')
    expect(await within(dialog).findByText(/about \$25\.00 per person/i)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(async () => {
      const v = await new MockVisitRepository().get('visit-chipotle')
      expect(v?.amountSpent).toBe(100)
      expect(v?.partySize).toBe(4)
    })
  })

  it('marks a draft complete from the detail page', async () => {
    const user = userEvent.setup()
    renderApp('/visits/visit-chipotle')
    await user.click(await screen.findByRole('button', { name: /mark complete/i }))
    await waitFor(async () => {
      expect((await new MockVisitRepository().get('visit-chipotle'))?.isDraft).toBe(false)
    })
  })
})

describe('journal filters', () => {
  it('Safe for Mia shows only restaurants with your own "fine" notes, and says so', async () => {
    const user = userEvent.setup()
    renderApp('/journal')
    expect(await screen.findByText(/Maggiano's Little Italy/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Safe for Mia' }))
    await waitFor(() =>
      expect(screen.queryByText(/Maggiano's Little Italy/)).not.toBeInTheDocument(),
    )
    expect(screen.getByText(/4 visits/)).toBeInTheDocument()
    expect(screen.getByText(/based only on dishes you marked as fine/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Safe for Mia' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    noSafetyClaims()
  })

  it('searches by dish name and reads filters from the URL', async () => {
    renderApp('/journal?q=shawarma')
    expect(await screen.findByText('Pita Inn')).toBeInTheDocument()
    expect(screen.queryByText(/Superdawg/)).not.toBeInTheDocument()
    expect(screen.getByText(/1 visit$/)).toBeInTheDocument()
  })

  it('shows a helpful empty result', async () => {
    renderApp('/journal?q=zzzz')
    expect(await screen.findByText(/no visits match those filters/i)).toBeInTheDocument()
  })
})

describe('wine tab', () => {
  it('shows both parents’ ratings and filters to favorites', async () => {
    const user = userEvent.setup()
    renderApp('/wine')
    expect(await screen.findByText('Moscato')).toBeInTheDocument()
    expect(
      screen.getAllByRole('img', { name: /Alex's rating: 4 out of 5/ }).length,
    ).toBeGreaterThan(0)
    expect(screen.getAllByRole('img', { name: /Sam's rating: 2 out of 5/ }).length).toBe(1)
    await user.click(screen.getByRole('button', { name: 'Favorites' }))
    await waitFor(() => expect(screen.queryByText('Moscato')).not.toBeInTheDocument())
    expect(screen.getByText('Pinot Noir')).toBeInTheDocument()
    expect(screen.getByText('Chianti Classico')).toBeInTheDocument()
  })

  it('adds a wine to a chosen visit', async () => {
    const user = userEvent.setup()
    renderApp('/wine')
    await user.click(await screen.findByRole('button', { name: /add wine/i }))
    const dialog = await screen.findByRole('dialog')
    await user.selectOptions(within(dialog).getByLabelText(/which visit/i), 'visit-pita')
    await user.type(await within(dialog).findByLabelText('Wine'), 'Assyrtiko')
    const alex = within(dialog).getByRole('radiogroup', { name: "Alex's rating" })
    await user.click(within(alex).getByRole('radio', { name: '5 stars' }))
    await user.click(within(dialog).getByRole('button', { name: /save wine/i }))
    await waitFor(async () => {
      const wines = await new MockWineRepository().listByVisit('visit-pita')
      expect(wines.map((w) => w.name)).toContain('Assyrtiko')
      expect(wines.find((w) => w.name === 'Assyrtiko')?.ratings).toEqual({ alex: 5 })
    })
  })
})

describe('restaurant detail', () => {
  it('lists visits, loved dishes, kid info and dated notes with the confirm prompt', async () => {
    renderApp('/restaurants/rest-pita-inn')
    expect(await screen.findByRole('heading', { name: 'Pita Inn', level: 1 })).toBeInTheDocument()
    expect(await screen.findByText('Chicken shawarma plate')).toBeInTheDocument()
    expect(screen.getAllByText(/Aug 16, 2026/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/confirm with the restaurant again/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/High chair/)).toBeInTheDocument()
    noSafetyClaims()
  })
})
