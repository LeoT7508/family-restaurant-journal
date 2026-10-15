import { Badge, Rating } from '@/components/ui'
import type { ShareCard } from '@/lib/shareCard'

/** Renders a share card. It accepts only a `ShareCard`, so it cannot show anything else. */
export function ShareCardView({ card }: { card: ShareCard }) {
  return (
    <article
      aria-label={`Share card for ${card.restaurant}`}
      className="overflow-hidden rounded-xl border border-line bg-surface shadow-card"
    >
      <div className="h-2 bg-brand" />
      <div className="flex flex-col gap-4 p-5">
        <div>
          <h3 className="text-2xl">{card.restaurant}</h3>
          <p className="text-ink-muted">
            {card.cuisine} · {'$'.repeat(card.priceLevel)}
          </p>
        </div>
        {card.rating !== null && (
          <Rating label="Rating" value={Math.round(card.rating)} size={26} />
        )}
        {card.lovedDishes.length > 0 && (
          <section aria-label="Loved dishes">
            <p className="text-xs font-medium uppercase tracking-wide text-accent">Loved</p>
            <ul className="mt-1 flex flex-col gap-0.5">
              {card.lovedDishes.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </section>
        )}
        {card.wineHighlights.length > 0 && (
          <section aria-label="Wine highlights">
            <p className="text-xs font-medium uppercase tracking-wide text-accent">Wine</p>
            <ul className="mt-1 flex flex-col gap-0.5">
              {card.wineHighlights.map((w) => (
                <li key={w.name}>
                  {w.name}
                  {w.detail && <span className="text-ink-muted"> ({w.detail})</span>}
                </li>
              ))}
            </ul>
          </section>
        )}
        {card.kidFriendly.length > 0 && (
          <section aria-label="Kid-friendly">
            <p className="text-xs font-medium uppercase tracking-wide text-accent">Kid-friendly</p>
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {card.kidFriendly.map((k) => (
                <li key={k}>
                  <Badge tone="sage" icon="check">
                    {k}
                  </Badge>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </article>
  )
}
