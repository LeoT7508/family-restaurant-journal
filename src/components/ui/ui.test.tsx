import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { BottomSheet, Button, Chip, Input, Rating, Tabs } from '.'

describe('Rating', () => {
  it('announces read-only value in words', () => {
    render(<Rating label="Family rating" value={4} />)
    expect(screen.getByRole('img', { name: 'Family rating: 4 out of 5' })).toBeInTheDocument()
  })

  it('is a keyboard-operable radio group', async () => {
    const user = userEvent.setup()
    const Harness = () => {
      const [v, setV] = useState<number | undefined>(2)
      return <Rating label="Taste" value={v} onChange={setV} />
    }
    render(<Harness />)
    const three = screen.getByRole('radio', { name: '3 stars' })
    await user.click(three)
    expect(three).toHaveAttribute('aria-checked', 'true')
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('radio', { name: '4 stars' })).toHaveAttribute('aria-checked', 'true')
  })
})

describe('Input', () => {
  it('links label, hint and error for assistive tech', () => {
    render(<Input label="Name" error="Required" />)
    const input = screen.getByLabelText('Name')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent('Required')
    expect(input.getAttribute('aria-describedby')).toBe(screen.getByRole('alert').id)
  })
})

describe('Chip', () => {
  it('toggles with aria-pressed and shows a check (not color alone)', async () => {
    const onClick = vi.fn()
    render(
      <Chip selected onClick={onClick}>
        Pizza
      </Chip>,
    )
    const chip = screen.getByRole('button', { name: 'Pizza' })
    expect(chip).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(chip)
    expect(onClick).toHaveBeenCalled()
  })
})

describe('Tabs', () => {
  it('moves selection with arrow keys', async () => {
    const user = userEvent.setup()
    const Harness = () => {
      const [v, setV] = useState('a')
      return (
        <Tabs
          label="Demo"
          value={v}
          onChange={setV}
          items={[
            { value: 'a', label: 'One' },
            { value: 'b', label: 'Two' },
          ]}
        >
          panel {v}
        </Tabs>
      )
    }
    render(<Harness />)
    await user.click(screen.getByRole('tab', { name: 'One' }))
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Two' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel')).toHaveTextContent('panel b')
  })
})

describe('BottomSheet', () => {
  it('is a labelled modal dialog that closes on Escape and restores focus', async () => {
    const user = userEvent.setup()
    const Harness = () => {
      const [open, setOpen] = useState(false)
      return (
        <>
          <Button onClick={() => setOpen(true)}>Open</Button>
          <BottomSheet open={open} onClose={() => setOpen(false)} title="Edit">
            <Input label="Name" />
          </BottomSheet>
        </>
      )
    }
    render(<Harness />)
    const trigger = screen.getByRole('button', { name: 'Open' })
    await user.click(trigger)
    expect(screen.getByRole('dialog', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })
})
