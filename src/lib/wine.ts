import type { WineEntry, WineFormValues } from '@/types'

export interface WineFilters {
  q: string
  serving: '' | 'glass' | 'bottle'
  favoritesOnly: boolean
  minRating: number
}

export const EMPTY_WINE_FILTERS: WineFilters = {
  q: '',
  serving: '',
  favoritesOnly: false,
  minRating: 0,
}

const ratingValues = (w: WineEntry) => Object.values(w.ratings)

/** Average of the ratings given, or null if nobody rated it. */
export function wineAverage(w: WineEntry): number | null {
  const values = ratingValues(w)
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

/** A favorite is rated 4 or higher by everyone who rated it. */
export function isFavoriteWine(w: WineEntry): boolean {
  const values = ratingValues(w)
  return values.length > 0 && values.every((r) => r >= 4)
}

export function filterWines(wines: WineEntry[], f: WineFilters): WineEntry[] {
  const q = f.q.trim().toLowerCase()
  return wines.filter((w) => {
    if (f.serving && w.servingType !== f.serving) return false
    if (f.favoritesOnly && !isFavoriteWine(w)) return false
    if (f.minRating > 0) {
      const avg = wineAverage(w)
      if (avg === null || avg < f.minRating) return false
    }
    if (q) {
      const text = [w.name, w.producer, w.grapeOrRegion, w.tastingNote].join(' ').toLowerCase()
      if (!text.includes(q)) return false
    }
    return true
  })
}

export const wineToForm = (w: WineEntry): WineFormValues => ({
  name: w.name,
  producer: w.producer,
  grapeOrRegion: w.grapeOrRegion,
  servingType: w.servingType,
  price: w.price,
  ratings: w.ratings,
  tastingNote: w.tastingNote,
  labelPhoto: w.labelPhoto,
  pairedDishIds: w.pairedDishIds,
})

export const EMPTY_WINE: WineFormValues = {
  name: '',
  producer: '',
  grapeOrRegion: '',
  servingType: 'glass',
  ratings: {},
  tastingNote: '',
  pairedDishIds: [],
}
