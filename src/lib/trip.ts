/** Places saved while travelling carry a `trip:<destination>` tag, so home-based features can skip them. */
export const TRIP_PREFIX = 'trip:'

export const tripTag = (destination: string) => `${TRIP_PREFIX}${destination.trim()}`

/** The trip destination for a place, or null for places near home. */
export function tripDestination(tags: readonly string[]): string | null {
  const tag = tags.find((t) => t.startsWith(TRIP_PREFIX))
  return tag ? tag.slice(TRIP_PREFIX.length) : null
}

export const isTripPlace = (tags: readonly string[]) => tripDestination(tags) !== null

export const sameDestination = (a: string, b: string) =>
  a.trim().toLowerCase() === b.trim().toLowerCase()
