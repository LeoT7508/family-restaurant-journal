import type { MapMarker, MapViewProps } from '@/services/MapView'
import { cn } from '@/lib/cn'

const SIZE = 400
const CENTER = SIZE / 2
const MAX_RADIUS = 168
const RINGS = [10, 20, 30]

/** Same name always lands at the same angle, so pins don't jump around between renders. */
function angleFor(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return (h % 360) * (Math.PI / 180)
}

function position(m: MapMarker, scaleMinutes: number) {
  const r = (Math.min(m.driveMinutes, scaleMinutes) / scaleMinutes) * MAX_RADIUS
  const a = angleFor(m.id)
  return { x: CENTER + r * Math.cos(a), y: CENTER + r * Math.sin(a) }
}

/** A stand-in for a real map: home in the middle, drive-time rings, one pin per place. */
export function PlaceholderMap({
  markers,
  selectedId,
  onSelect,
  homeLabel,
  radiusMinutes,
}: MapViewProps) {
  const scale = Math.max(30, radiusMinutes, ...markers.map((m) => m.driveMinutes))
  const rings = [...new Set([...RINGS, scale])].filter((m) => m <= scale).sort((a, b) => a - b)

  return (
    <figure className="flex flex-col gap-2">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="group"
        aria-label={`Placeholder map around ${homeLabel}, with ${markers.length} places`}
        className="w-full rounded-lg border border-line bg-surface-2"
        onClick={() => onSelect(null)}
      >
        {rings.map((m) => (
          <g key={m}>
            <circle
              cx={CENTER}
              cy={CENTER}
              r={(m / scale) * MAX_RADIUS}
              fill="none"
              stroke="rgb(var(--color-line))"
              strokeWidth={m === radiusMinutes ? 2.5 : 1.5}
              strokeDasharray={m === radiusMinutes ? undefined : '4 5'}
            />
            <text
              x={CENTER}
              y={CENTER - (m / scale) * MAX_RADIUS - 4}
              textAnchor="middle"
              fontSize="11"
              fill="rgb(var(--color-ink-muted))"
            >
              {m} min
            </text>
          </g>
        ))}

        <g aria-label={`Home: ${homeLabel}`}>
          <circle cx={CENTER} cy={CENTER} r={11} fill="rgb(var(--color-ink))" />
          <text
            x={CENTER}
            y={CENTER + 4}
            textAnchor="middle"
            fontSize="11"
            fill="rgb(var(--color-canvas))"
          >
            H
          </text>
        </g>

        {markers.map((m) => {
          const { x, y } = position(m, scale)
          const selected = m.id === selectedId
          const label = `${m.name}, ${m.driveMinutes} minutes away, ${
            m.kind === 'wishlist'
              ? 'on the wishlist'
              : m.kind === 'both'
                ? 'visited and on the wishlist'
                : 'visited'
          }`
          return (
            <g
              key={m.id}
              role="button"
              tabIndex={0}
              aria-label={label}
              aria-pressed={selected}
              className="cursor-pointer outline-none [&:focus-visible>.halo]:stroke-accent"
              onClick={(e) => {
                e.stopPropagation()
                onSelect(selected ? null : m.id)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelect(selected ? null : m.id)
                }
              }}
            >
              <circle
                className="halo"
                cx={x}
                cy={y}
                r={selected ? 17 : 15}
                fill="transparent"
                stroke="transparent"
                strokeWidth={3}
              />
              {m.kind === 'wishlist' ? (
                // Diamond = still to try
                <rect
                  x={x - 8}
                  y={y - 8}
                  width={16}
                  height={16}
                  transform={`rotate(45 ${x} ${y})`}
                  fill="rgb(var(--color-surface))"
                  stroke="rgb(var(--color-highlight))"
                  strokeWidth={3}
                />
              ) : (
                // Filled circle = visited (ring when also on the wishlist)
                <>
                  <circle cx={x} cy={y} r={9} fill="rgb(var(--color-accent))" />
                  {m.kind === 'both' && (
                    <circle
                      cx={x}
                      cy={y}
                      r={13}
                      fill="none"
                      stroke="rgb(var(--color-highlight))"
                      strokeWidth={2.5}
                    />
                  )}
                </>
              )}
              {selected && (
                <text
                  x={x}
                  y={y - 20}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="500"
                  paintOrder="stroke"
                  stroke="rgb(var(--color-surface))"
                  strokeWidth={4}
                  fill="rgb(var(--color-ink))"
                >
                  {m.name}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      <figcaption className="flex flex-col gap-1 text-xs text-ink-muted">
        <span className="flex flex-wrap gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <circle cx="7" cy="7" r="5" className="fill-accent" />
            </svg>
            Visited
          </span>
          <span className="inline-flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <rect
                x="3"
                y="3"
                width="8"
                height="8"
                transform="rotate(45 7 7)"
                className="fill-surface stroke-highlight"
                strokeWidth="2"
              />
            </svg>
            Wishlist
          </span>
          <span className="inline-flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <circle cx="7" cy="7" r="4" className="fill-accent" />
              <circle
                cx="7"
                cy="7"
                r="6"
                fill="none"
                className="stroke-highlight"
                strokeWidth="1.5"
              />
            </svg>
            Both
          </span>
        </span>
        <span className={cn('max-w-prose')}>
          Placeholder map: the distance from home is accurate, the direction is not. A real map will
          replace it.
        </span>
      </figcaption>
    </figure>
  )
}
