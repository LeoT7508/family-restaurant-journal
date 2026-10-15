import type { ShareCard } from './shareCard'

const W = 1080
const H = 1350

/** Draws a share card to a PNG. Only ever receives a `ShareCard`, so it can only draw food info. */
export async function shareCardToBlob(card: ShareCard): Promise<Blob | null> {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#46b0a7'
  ctx.fillRect(0, 0, W, 28)

  let y = 140
  const font = (size: number, weight = 400) =>
    `${weight} ${size}px "Nunito Variable", ui-rounded, system-ui, sans-serif`
  const wrap = (text: string, x: number, maxWidth: number, lineHeight: number) => {
    const words = text.split(' ')
    let line = ''
    for (const word of words) {
      const test = line ? `${line} ${word}` : word
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, y)
        y += lineHeight
        line = word
      } else line = test
    }
    if (line) {
      ctx.fillText(line, x, y)
      y += lineHeight
    }
  }

  ctx.fillStyle = '#202020'
  ctx.font = font(78, 600)
  wrap(card.restaurant, 80, W - 160, 92)
  ctx.fillStyle = '#626270'
  ctx.font = font(40)
  ctx.fillText(`${card.cuisine}  ·  ${'$'.repeat(card.priceLevel)}`, 80, y)
  y += 90

  if (card.rating !== null) {
    ctx.fillStyle = '#e06e00'
    ctx.font = font(64, 600)
    ctx.fillText(
      `${'★'.repeat(Math.round(card.rating))}${'☆'.repeat(5 - Math.round(card.rating))}`,
      80,
      y,
    )
    y += 100
  }

  const block = (title: string, lines: string[]) => {
    if (lines.length === 0) return
    ctx.fillStyle = '#107670'
    ctx.font = font(36, 600)
    ctx.fillText(title.toUpperCase(), 80, y)
    y += 56
    ctx.fillStyle = '#202020'
    ctx.font = font(44)
    for (const line of lines) wrap(line, 80, W - 160, 58)
    y += 40
  }
  block('Loved', card.lovedDishes)
  block(
    'Wine',
    card.wineHighlights.map((w) => (w.detail ? `${w.name} (${w.detail})` : w.name)),
  )
  block('Kid-friendly', card.kidFriendly)

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'))
}
