import {
  drawWordmark,
  fitWordmarkSize,
  wordmarkFitFraction,
  WORDMARK_ASPECT,
} from './draw-wordmark'

export type WordMask = {
  dataUrl: string
  width: number
  height: number
  /** Top/bottom of the letter ink in stage CSS px (for hover volume mapping). */
  inkTop: number
  inkBottom: number
  /** Hit-test letter ink. `x`/`y` are CSS pixels in the stage. */
  hitTest: (x: number, y: number, padPx?: number) => boolean
}

/** Builds an alpha mask of `word` using the WebGL wordmark's screen projection. */
export function buildWordMask(
  word: string,
  viewportW: number,
  viewportH: number,
): WordMask {
  const w = Math.max(2, Math.round(viewportW))
  const h = Math.max(2, Math.round(viewportH))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.clearRect(0, 0, w, h)

  const wordAspect = WORDMARK_ASPECT
  const margin = wordmarkFitFraction(w / h)
  let boxW = w * margin
  let boxH = boxW / wordAspect
  if (boxH > h * margin) {
    boxH = h * margin
    boxW = boxH * wordAspect
  }

  const preferred = boxH * (240 / 320)
  const maxTextW = boxW * (1 - 80 / 1024)
  const fontSize = fitWordmarkSize(ctx, word, preferred, maxTextW)
  drawWordmark(ctx, word, w / 2, h / 2, fontSize)

  const image = ctx.getImageData(0, 0, w, h)
  const data = image.data
  // ASCII post-processing expands the particle image into w/200-wide cells,
  // while the flow field lets edge particles drift slightly from their base.
  // Include both allowances so every visibly occupied edge remains interactive.
  const asciiCellPx = w / 200
  const particleDriftPx = Math.min(w, h) * 0.004
  const radius = Math.max(3, Math.ceil(asciiCellPx + particleDriftPx))

  // Vertical extent of the ink — used to map cursor height to hover volume.
  let inkTop = -1
  let inkBottom = -1
  for (let y = 0; y < h; y++) {
    const rowBase = y * w * 4
    let rowHit = false
    for (let x = 0; x < w; x++) {
      if (data[rowBase + x * 4 + 3] > 24) {
        rowHit = true
        break
      }
    }
    if (rowHit) {
      if (inkTop < 0) inkTop = y
      inkBottom = y
    }
  }
  if (inkTop < 0) {
    inkTop = 0
    inkBottom = h
  }

  const hitTest = (x: number, y: number, padPx = 0) => {
    const px = Math.round(x)
    const py = Math.round(y)
    const r = radius + Math.max(0, Math.round(padPx))
    for (let oy = -r; oy <= r; oy++) {
      for (let ox = -r; ox <= r; ox++) {
        const sx = px + ox
        const sy = py + oy
        if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue
        if (data[(sy * w + sx) * 4 + 3] > 24) return true
      }
    }
    return false
  }

  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: w,
    height: h,
    inkTop,
    inkBottom,
    hitTest,
  }
}

export function buildWordMaskDataUrl(
  word: string,
  viewportW: number,
  viewportH: number,
): string {
  return buildWordMask(word, viewportW, viewportH).dataUrl
}
