import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync('src/styles/tokens.css', 'utf8')

function parseBlock(selector: string): Record<string, [number, number, number]> {
  const start = css.indexOf(`${selector} {`)
  const body = css.slice(start, css.indexOf('}', start))
  const tokens: Record<string, [number, number, number]> = {}
  for (const m of body.matchAll(/--color-([a-z0-9-]+):\s*(\d+) (\d+) (\d+)/g)) {
    tokens[m[1]!] = [Number(m[2]), Number(m[3]), Number(m[4])]
  }
  return tokens
}

const channel = (v: number) => {
  const s = v / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}
const luminance = ([r, g, b]: [number, number, number]) =>
  0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
const contrast = (a: [number, number, number], b: [number, number, number]) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

// Pairs that carry text (WCAG AA needs 4.5:1).
const TEXT_PAIRS: [string, string][] = [
  ['ink', 'canvas'],
  ['ink', 'surface'],
  ['ink', 'surface-2'],
  ['ink-muted', 'canvas'],
  ['ink-muted', 'surface'],
  ['ink-muted', 'surface-2'],
  ['canvas', 'ink'],
  ['canvas', 'accent-strong'], // primary button label on its deep-teal pill
  ['accent-strong', 'canvas'], // secondary and ghost button text
  ['accent-strong', 'accent-soft'], // secondary and ghost button text when hovered
  ['accent-ink', 'accent'],
  ['accent-ink', 'accent-strong'],
  ['accent', 'canvas'],
  ['accent', 'surface'],
  ['accent', 'accent-soft'],
  ['sage', 'sage-soft'],
  ['sage', 'surface'],
  ['ink', 'highlight-soft'],
  ['calm', 'calm-soft'],
  ['success', 'success-soft'],
  ['danger', 'danger-soft'],
  ['danger', 'surface'],
]

describe.each([
  ['light', ':root'],
  ['dark', '.dark'],
])('%s theme contrast', (_name, selector) => {
  const tokens = parseBlock(selector)
  it.each(TEXT_PAIRS)('%s on %s meets 4.5:1', (fg, bg) => {
    expect(tokens[fg], `missing ${fg}`).toBeDefined()
    expect(tokens[bg], `missing ${bg}`).toBeDefined()
    expect(contrast(tokens[fg]!, tokens[bg]!)).toBeGreaterThanOrEqual(4.5)
  })

  it('uses star/highlight color with at least 3:1 against surfaces (non-text)', () => {
    expect(contrast(tokens['highlight']!, tokens['surface']!)).toBeGreaterThanOrEqual(3)
  })
})
