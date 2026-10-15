import { useMemo, useRef, useState } from 'react'
import { PageHeader } from '@/components/features/PageHeader'
import { SuggestionCard } from '@/components/features/SuggestionCard'
import {
  Button,
  Checkbox,
  Chip,
  EmptyState,
  ErrorState,
  Icon,
  ListSkeleton,
  Segmented,
} from '@/components/ui'
import { useHousehold } from '@/hooks/queries'
import { useRecommendContext } from '@/hooks/useRecommendContext'
import { SAFE_FILTER_LABEL } from '@/lib/allergy'
import { DEFAULT_ANSWERS, recommend, type Suggestion, type TonightAnswers } from '@/lib/recommend'

const DRIVE_CHOICES = [10, 15, 20, 30]

export default function WhereTonight() {
  const { ctx, isLoading, isError, refetch } = useRecommendContext()
  const household = useHousehold()
  const [answers, setAnswers] = useState<TonightAnswers>(DEFAULT_ANSWERS)
  const [results, setResults] = useState<{ list: Suggestion[]; fromHistory: number } | null>(null)
  const [seen, setSeen] = useState<Set<string>>(new Set())
  const resultsRef = useRef<HTMLDivElement>(null)

  // The drive-time answer starts at the household's own radius until someone changes it.
  const travelDestination = household.data?.travel?.destination
  const radius = household.data?.driveRadiusMinutes ?? 20
  const defaultDrive = DRIVE_CHOICES.reduce((a, b) =>
    Math.abs(b - radius) < Math.abs(a - radius) ? b : a,
  )
  const [driveOverride, setDriveOverride] = useState<number | null>(null)
  const effective: TonightAnswers = {
    ...answers,
    maxDriveMinutes: driveOverride ?? defaultDrive,
  }

  const cuisineOptions = useMemo(() => {
    if (!ctx) return []
    const saved = new Set(ctx.restaurants.map((r) => r.cuisine))
    const all = [...new Set([...saved, ...ctx.places.map((p) => p.cuisine)])]
    // Cuisines you already know come first.
    return all.sort((a, b) => Number(saved.has(b)) - Number(saved.has(a)) || a.localeCompare(b))
  }, [ctx])

  const allergic = ctx?.members.find((m) => m.allergies.length > 0)

  const run = (exclude: Set<string>) => {
    if (!ctx) return
    const { suggestions, fromHistory } = recommend(effective, ctx, { limit: 3, exclude })
    setResults({ list: suggestions, fromHistory })
    setSeen(new Set([...exclude, ...suggestions.map((s) => s.key)]))
    window.setTimeout(() => resultsRef.current?.focus(), 0)
  }

  const toggleCuisine = (c: string) =>
    setAnswers((a) => ({
      ...a,
      cuisines: a.cuisines.includes(c) ? a.cuisines.filter((x) => x !== c) : [...a.cuisines, c],
    }))

  if (isLoading) return <ListSkeleton rows={3} />
  if (isError || !ctx) return <ErrorState onRetry={refetch} />

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Where tonight?"
        subtitle="Three quick questions, three ideas from your own history."
      />

      <form
        className="flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault()
          run(new Set())
        }}
      >
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-base font-medium">1. What are you in the mood for?</legend>
          <ul className="flex flex-wrap gap-2">
            {cuisineOptions.slice(0, 14).map((c) => (
              <li key={c}>
                <Chip selected={answers.cuisines.includes(c)} onClick={() => toggleCuisine(c)}>
                  {c}
                </Chip>
              </li>
            ))}
          </ul>
          <p className="text-sm text-ink-muted">Pick as many as you like, or none for anything.</p>
        </fieldset>

        {travelDestination ? (
          <p className="rounded-md bg-accent-soft p-3 text-sm text-accent">
            Travel mode is on. Ideas come from places you saved on your {travelDestination} trip,
            and drive time from home is ignored.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <span className="text-base font-medium">2. How far are you willing to drive?</span>
            <Segmented
              label="How far are you willing to drive?"
              value={String(effective.maxDriveMinutes)}
              onChange={(v) => setDriveOverride(Number(v))}
              options={DRIVE_CHOICES.map((m) => ({ value: String(m), label: `${m} min` }))}
            />
          </div>
        )}

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-base font-medium">3. Anything to keep in mind?</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Checkbox
              label="Kid-friendly"
              checked={answers.kidFriendly}
              onChange={(e) => setAnswers({ ...answers, kidFriendly: e.target.checked })}
            />
            {allergic && (
              <Checkbox
                label={`${SAFE_FILTER_LABEL} (from our notes)`}
                checked={answers.safeForAllergy}
                onChange={(e) => setAnswers({ ...answers, safeForAllergy: e.target.checked })}
              />
            )}
            <Checkbox
              label="Quick service"
              checked={answers.quickService}
              onChange={(e) => setAnswers({ ...answers, quickService: e.target.checked })}
            />
            <Checkbox
              label="Good for wine"
              checked={answers.wineList}
              onChange={(e) => setAnswers({ ...answers, wineList: e.target.checked })}
            />
          </div>
          {allergic && answers.safeForAllergy && (
            <p className="text-sm text-ink-muted">
              Only places where your own notes say {allergic.name} ate a dish fine. Always confirm
              with the restaurant again.
            </p>
          )}
        </fieldset>

        <Button type="submit" size="lg" fullWidth>
          <Icon name="sparkle" /> Find 3 places
        </Button>
      </form>

      <div ref={resultsRef} tabIndex={-1} aria-live="polite" className="mt-8 outline-none">
        {results &&
          (results.list.length === 0 ? (
            <EmptyState
              icon="search"
              title="Nothing matches all of that"
              description="Try a longer drive, fewer must-haves, or more cuisines."
            />
          ) : (
            <section aria-labelledby="ideas" className="flex flex-col gap-4">
              <h2 id="ideas" className="text-xl">
                {results.list.length === 1
                  ? 'Here is an idea'
                  : `Here are ${results.list.length} ideas`}
              </h2>
              {results.fromHistory < results.list.length && (
                <p className="text-sm text-ink-muted">
                  Only {results.fromHistory} {results.fromHistory === 1 ? 'place' : 'places'} in
                  your journal or wishlist matched, so the rest are new to you.
                </p>
              )}
              <ul className="flex flex-col gap-3">
                {results.list.map((s) => (
                  <li key={s.key}>
                    <SuggestionCard suggestion={s} />
                  </li>
                ))}
              </ul>
              <Button variant="secondary" onClick={() => run(seen)}>
                Show me different ones
              </Button>
            </section>
          ))}
      </div>
    </div>
  )
}
