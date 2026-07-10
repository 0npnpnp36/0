import { drawWordmark, fitWordmarkSize, WORDMARK_VIEW_SCALE } from './draw-wordmark'

export type WordMask = {
  dataUrl: string
  width: number
  height: number
  /** Hit-test letter ink. `x`/`y` are CSS pixels in the stage. */
  hitTest: (x: number, y: number) => boolean
}

/** Builds an alpha mask of `word` framed like the ASCII wordmark (1024×320 @ ~92%). */
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

  const wordAspect = 1024 / 320
  const margin = 0.92 * WORDMARK_VIEW_SCALE
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
  const radius = Math.max(2, Math.round(Math.min(w, h) * 0.006))

  const hitTest = (x: number, y: number) => {
    const px = Math.round(x)
    const py = Math.round(y)
    for (let oy = -radius; oy <= radius; oy++) {
      for (let ox = -radius; ox <= radius; ox++) {
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
