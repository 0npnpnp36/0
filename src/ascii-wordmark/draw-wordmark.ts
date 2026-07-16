export const WORDMARK_FONT = 'Karma'

/** On-screen size multiplier vs the default framed wordmark (landscape). */
export const WORDMARK_VIEW_SCALE = 0.67

/** Particle / mask canvas aspect (matches word-points). */
export const WORDMARK_ASPECT = 1024 / 320

/**
 * Aff reads tiny on portrait if we keep the landscape scale — bump it
 * so love/prompt ratios can stay locked to the same frame.
 */
export function wordmarkViewScale(viewportAspect: number): number {
  if (viewportAspect < 0.7) return 0.9
  if (viewportAspect < 1) return 0.8
  return WORDMARK_VIEW_SCALE
}

/** Camera distance multiplier (larger → smaller Aff on screen). */
export function wordmarkCameraMargin(viewportAspect: number): number {
  return 0.92 / wordmarkViewScale(viewportAspect)
}

/**
 * Projected wordmark frame as a fraction of the limiting viewport edge.
 * This must be the reciprocal of the camera margin so the DOM hit mask and
 * the WebGL particle wordmark use the same screen-space transform.
 */
export function wordmarkFitFraction(viewportAspect: number): number {
  return 1 / wordmarkCameraMargin(viewportAspect)
}

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
