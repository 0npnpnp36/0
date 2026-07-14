import { useEffect, useRef } from 'react'

const NS = 'http://www.w3.org/2000/svg'
const SEED = 7

/** Seeded RNG — stable layout across reloads. */
function makeRand(seed: number) {
  let s = seed
  const rand = () => (s = (s * 9301 + 49297) % 233280) / 233280
  return {
    rand,
    rr: (a: number, b: number) => a + rand() * (b - a),
  }
}

function el(name: string, attrs: Record<string, string | number>) {
  const n = document.createElementNS(NS, name)
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v))
  return n
}

/** Distance from center to ellipse edge along unit direction (ux, uy). */
function ellipseGap(ux: number, uy: number, gapX: number, gapY: number) {
  const a = gapX > 1 ? gapX : 1
  const b = gapY > 1 ? gapY : 1
  return 1 / Math.sqrt((ux * ux) / (a * a) + (uy * uy) / (b * b))
}

/**
 * Four corner chains converging on Aff.
 * Clear zone is an ellipse around Aff so left/right/top/bottom gaps match.
 */
export function AffChains() {
  const hostRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const host = hostRef.current
    const svg = svgRef.current
    if (!host || !svg) return

    const draw = () => {
      const stage = host.parentElement
      if (!stage) return

      const W = stage.clientWidth
      const H = stage.clientHeight
      if (W < 2 || H < 2) return

      const cs = getComputedStyle(stage)
      const affH =
        parseFloat(cs.getPropertyValue('--aff-h')) || Math.min(W / 3.2, H) * 0.5
      const affAspect =
        parseFloat(cs.getPropertyValue('--aff-aspect')) || 3.2

      // Aff letter box — hub on Aff center (not the love horizontal nudge)
      const letterW = affH * affAspect * 0.3
      const letterH = affH * 0.52
      const cx = W * 0.5
      const cy = H * 0.5 - affH * 0.056

      // Equal padding around the word (elliptical clear zone)
      const pad = 1.08
      const gapX = (letterW / 2) * pad
      const gapY = (letterH / 2) * pad

      const scale = Math.min(1.15, Math.max(0.55, affH / 220)) / 3
      const spacing = 86 * scale
      const linkLen = 56 * scale
      const linkWid = 22 * scale
      const wobble = 14 * scale
      const opacity = 0.14

      const targets = [
        { x: -60, y: -60 },
        { x: W + 60, y: -60 },
        { x: -60, y: H + 60 },
        { x: W + 60, y: H + 60 },
      ]

      const { rr } = makeRand(SEED)

      svg.setAttribute('viewBox', `0 0 ${W} ${H}`)
      svg.replaceChildren()

      for (const t of targets) {
        const g = el('g', {
          fill: 'none',
          stroke: '#ffffff',
          'stroke-opacity': opacity,
          'stroke-linecap': 'round',
        })

        const dx = t.x - cx
        const dy = t.y - cy
        const dist = Math.hypot(dx, dy)
        if (dist < 1) continue
        const ang = Math.atan2(dy, dx)
        const deg = (ang * 180) / Math.PI
        const ux = dx / dist
        const uy = dy / dist
        const px = -uy
        const py = ux

        // Per-ray start so left/right clear matches Aff’s wide box
        const startGap = ellipseGap(ux, uy, gapX, gapY)

        let d = ''
        for (let s = startGap; s <= dist; s += 24) {
          const w = Math.sin(s / 130) * wobble
          const x = cx + ux * s + px * w
          const y = cy + uy * s + py * w
          d += `${s === startGap ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)} `
        }
        g.appendChild(
          el('path', {
            d,
            'stroke-width': 1 * scale,
            'stroke-opacity': opacity * 0.5,
          }),
        )

        for (let s = startGap; s < dist - 40; s += spacing) {
          const w = Math.sin(s / 130) * wobble
          const jx = rr(-7, 7) * scale
          const jy = rr(-7, 7) * scale
          const x = cx + ux * s + px * w + jx
          const y = cy + uy * s + py * w + jy
          const rot = deg + rr(-9, 9)
          g.appendChild(
            el('ellipse', {
              cx: x.toFixed(1),
              cy: y.toFixed(1),
              rx: (linkLen * rr(0.9, 1.1)).toFixed(1),
              ry: (linkWid * rr(0.85, 1.15)).toFixed(1),
              transform: `rotate(${rot.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})`,
              'stroke-width': 1.6 * scale,
            }),
          )
        }

        svg.appendChild(g)
      }
    }

    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(host.parentElement ?? host)
    window.addEventListener('resize', draw)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', draw)
    }
  }, [])

  return (
    <div ref={hostRef} className="aff-chains" aria-hidden="true">
      <svg ref={svgRef} preserveAspectRatio="none" />
    </div>
  )
}
