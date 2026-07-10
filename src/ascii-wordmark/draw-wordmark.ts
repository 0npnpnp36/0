export const WORDMARK_FONT = 'Karma'

/** On-screen size multiplier vs the default framed wordmark. */
export const WORDMARK_VIEW_SCALE = 0.67

function wordFont(size: number) {
  return `700 ${size}px ${WORDMARK_FONT}, Georgia, "Times New Roman", serif`
}

/** Lowercase glyphs render at this fraction of the capital size. */
export const LOWERCASE_SCALE = 0.78

function glyphSize(ch: string, baseSize: number) {
  return /[a-z]/.test(ch) ? baseSize * LOWERCASE_SCALE : baseSize
}

/** Measure mixed-case width (capitals full size, lowercase scaled). */
export function measureWordmarkWidth(
  ctx: CanvasRenderingContext2D,
  word: string,
  baseSize: number,
): number {
  let width = 0
  for (const ch of word) {
    ctx.font = wordFont(glyphSize(ch, baseSize))
    width += ctx.measureText(ch).width
  }
  return width
}

/**
 * Draw `word` centered at (cx, cy). Capitals use `baseSize`;
 * lowercase letters use `baseSize * LOWERCASE_SCALE`, shared baseline.
 */
export function drawWordmark(
  ctx: CanvasRenderingContext2D,
  word: string,
  cx: number,
  cy: number,
  baseSize: number,
) {
  ctx.fillStyle = '#fff'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'

  ctx.font = wordFont(baseSize)
  const metrics = ctx.measureText('A')
  const ascent = metrics.actualBoundingBoxAscent || baseSize * 0.75
  const descent = metrics.actualBoundingBoxDescent || baseSize * 0.15
  const baseline = cy + (ascent - descent) / 2

  const totalWidth = measureWordmarkWidth(ctx, word, baseSize)
  let x = cx - totalWidth / 2

  for (const ch of word) {
    const size = glyphSize(ch, baseSize)
    ctx.font = wordFont(size)
    ctx.fillText(ch, x, baseline)
    x += ctx.measureText(ch).width
  }
}

export function fitWordmarkSize(
  ctx: CanvasRenderingContext2D,
  word: string,
  preferredSize: number,
  maxWidth: number,
): number {
  let size = preferredSize
  let width = measureWordmarkWidth(ctx, word, size)
  if (width > maxWidth) {
    size = Math.floor(size * (maxWidth / width))
  }
  return size
}
