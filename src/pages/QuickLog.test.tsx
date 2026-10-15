import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '@/test/renderApp'
import { MockVisitRepository } from '@/data/mock/repositories'

describe('app shell', () => {
  it('renders Home with the main actions and recent visits', async () => {
    renderApp('/')
    expect(await screen.findByRole('link', { name: /log a visit/i })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /where tonight/i }).length).toBeGreaterThan(0)
    expect(await screen.findByText("Lou Malnati's Pizzeria")).toBeInTheDocument()
    expect(screen.getAllByRole('navigation', { name: 'Main' }).length).toBeGreaterThan(0)
  })

  it('shows the calm Mia badge and no alarming copy on the log screen', async () => {
    renderApp('/log')
    expect(await screen.findAllByText('Mia: egg')).not.toHaveLength(0)
    expect(screen.getByText(/confirm with the restaurant again/i)).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/egg[- ]?safe/i)
  })

  it('shows the first-run prompt when the journal is empty', async () => {
    localStorage.setItem('frj.v1.visits', '[]')
    renderApp('/')
    expect(await screen.findByText(/3 favorite meals/i)).toBeInTheDocument()
  })

  it('switches who is logging', async () => {
    const user = userEvent.setup()
    renderApp('/')
    const [sam] = await screen.findAllByRole('radio', { name: 'Sam' })
    await user.click(sam!)
    await waitFor(() => expect(localStorage.getItem('frj.v1.session')).toBe('sam'))
  })
})

describe('quick log', () => {
  it('requires a restaurant before saving', async () => {
    const user = userEvent.setup()
    renderApp('/log')
    await user.click(await screen.findByRole('button', { name: /save draft/i }))
    expect(await screen.findByText(/pick a restaurant first/i)).toBeInTheDocument()
  })

  it('searches, confirms a restaurant, and saves a draft', async () => {
    const user = userEvent.setup()
    renderApp('/log')
    await user.type(await screen.findByLabelText(/where did you eat/i), 'portillo')
    const results = await screen.findByRole('list', { name: /restaurant results/i })
    await user.click(await within(results).findByRole('button', { name: /portillo/i }))
    expect(await screen.findByRole('button', { name: /change restaurant/i })).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: '4 stars' }))
    await user.type(screen.getByLabelText(/short note/i), 'Great beef')
    await user.click(screen.getByRole('button', { name: /save draft/i }))

    await waitFor(async () => {
      const visits = await new MockVisitRepository().list()
      const saved = visits.find((v) => v.notes === 'Great beef')
      expect(saved).toBeDefined()
      expect(saved?.isDraft).toBe(true)
      expect(saved?.familyRating).toBe(4)
      expect(saved?.loggedBy).toBe('alex')
      expect(saved?.syncStatus).toBe('local')
    })
    expect(await screen.findByText(/draft saved/i)).toBeInTheDocument()
  })

  it('completes an existing draft', async () => {
    const user = userEvent.setup()
    renderApp('/log/visit-chipotle')
    await user.click(await screen.findByRole('button', { name: /mark complete/i }))
    await waitFor(async () => {
      const visit = await new MockVisitRepository().get('visit-chipotle')
      expect(visit?.isDraft).toBe(false)
    })
  })
})
