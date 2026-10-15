import { useMemo } from 'react'
import { BottomSheet, Button, Icon, useToast } from '@/components/ui'
import { useDishes, useKidInfo, useWines } from '@/hooks/journal'
import { shareCardToBlob } from '@/lib/shareImage'
import { buildShareCard, shareCardText } from '@/lib/shareCard'
import type { FamilyMember, Restaurant, Visit } from '@/types'
import { ShareCardView } from './ShareCardView'

interface ShareSheetProps {
  open: boolean
  onClose: () => void
  visit: Visit
  restaurant: Restaurant
  members: FamilyMember[]
}

/** Preview and share a food-only card for a visit. */
export function ShareSheet({ open, onClose, visit, restaurant, members }: ShareSheetProps) {
  const dishes = useDishes()
  const wines = useWines()
  const kidInfo = useKidInfo()
  const toast = useToast()

  const built = useMemo(() => {
    try {
      return {
        card: buildShareCard({
          visit,
          restaurant,
          dishes: dishes.data ?? [],
          wines: wines.data ?? [],
          kidInfo: kidInfo.data ?? [],
          members,
        }),
      }
    } catch (error) {
      // The safety check refused to build the card (for example, the place's name mentions a family member).
      return { error: error instanceof Error ? error.message : 'This card cannot be shared.' }
    }
  }, [visit, restaurant, dishes.data, wines.data, kidInfo.data, members])

  if (!built.card) {
    return (
      <BottomSheet open={open} onClose={onClose} title="Share this place">
        <p role="alert">
          This one can&apos;t be shared as is. {built.error} Rename the restaurant or the dish so it
          doesn&apos;t mention anyone in your family, then try again.
        </p>
      </BottomSheet>
    )
  }
  const card = built.card
  const text = shareCardText(card)
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      toast.show('Copied to the clipboard.')
    } catch {
      toast.show('Could not copy. Select the text and copy it yourself.', 'error')
    }
  }

  const share = async () => {
    try {
      await navigator.share({ title: card.restaurant, text })
    } catch {
      /* the person closed the share sheet */
    }
  }

  const download = async () => {
    const blob = await shareCardToBlob(card)
    if (!blob) {
      toast.show('Saving as an image is not available here.', 'error')
      return
    }
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${card.restaurant.replace(/[^\w]+/g, '-').toLowerCase()}.png`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Share this place">
      <div className="flex flex-col gap-4">
        <ShareCardView card={card} />
        <p className="text-sm text-ink-muted">
          Share cards only include food information: the restaurant, loved dishes, wine highlights,
          a rating and kid-friendly facts. They never include allergy notes, names or details about
          your children, or your own notes.
        </p>
        <div className="flex flex-wrap gap-2">
          {canShare && (
            <Button onClick={() => void share()}>
              <Icon name="plus" size={18} /> Share
            </Button>
          )}
          <Button variant={canShare ? 'secondary' : 'primary'} onClick={() => void copy()}>
            Copy text
          </Button>
          <Button variant="secondary" onClick={() => void download()}>
            Save as image
          </Button>
        </div>
      </div>
    </BottomSheet>
  )
}
