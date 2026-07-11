import { useCallback, useEffect, useRef, useState } from 'react'
import { AsciiWordmarkRenderer } from './ascii-wordmark'
import { LOWERCASE_SCALE, WORDMARK_FONT, WORDMARK_VIEW_SCALE } from './ascii-wordmark/draw-wordmark'
import { buildWordMask, type WordMask } from './ascii-wordmark/word-mask'
import { HoverStems } from './audio/hover-stems'
import { LoveAura } from './love-aura'
import './App.css'

const MAX_CROSSES = 3
const BREATH_MS = 6000
const WORD = 'Aff'
const PROMPT_VERBS = ['watching', 'listening', 'hearing'] as const
const PROMPT_HOLD_MS = 2800
const PROMPT_STRIKE_MS = 550
const PROMPT_CYCLES_BEFORE_PAUSE = 3
const PROMPT_PAUSE_MS = 9000

type Cross = {
  id: number
  x: number
  y: number
  size: number
}

let nextId = 0

function spawnCross(): Cross {
  return {
    id: nextId++,
    x: 6 + Math.random() * 88,
    y: 6 + Math.random() * 88,
    size: 18 + Math.random() * 42,
  }
}

function randomGapMs() {
  return 500 + Math.random() * 4000
}

function PromptLine() {
  const [index, setIndex] = useState(0)
  const [struck, setStruck] = useState(false)
  const [visible, setVisible] = useState(true)
  const cyclesRef = useRef(0)
  const indexRef = useRef(0)

  useEffect(() => {
    if (!visible) return

    let cancelled = false
    let timer = 0
    let phase: 'hold' | 'strike' = 'hold'
    indexRef.current = 0
    setIndex(0)
    setStruck(false)

    const schedule = (ms: number) => {
      timer = window.setTimeout(tick, ms)
    }

    const tick = () => {
      if (cancelled) return
      if (phase === 'hold') {
        setStruck(true)
        phase = 'strike'
        schedule(PROMPT_STRIKE_MS)
        return
      }

      const next = (indexRef.current + 1) % PROMPT_VERBS.length
      indexRef.current = next
      setIndex(next)
      setStruck(false)

      if (next === 0) {
        cyclesRef.current += 1
        if (cyclesRef.current >= PROMPT_CYCLES_BEFORE_PAUSE) {
          cyclesRef.current = 0
          setVisible(false)
          return
        }
      }

      phase = 'hold'
      schedule(PROMPT_HOLD_MS)
    }

    schedule(PROMPT_HOLD_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [visible])

  useEffect(() => {
    if (visible) return
    const timer = window.setTimeout(() => {
      setVisible(true)
    }, PROMPT_PAUSE_MS)
    return () => clearTimeout(timer)
  }, [visible])

  const verb = PROMPT_VERBS[index]

  return (
    <p
      className={`prompt${visible ? '' : ' is-hidden'}`}
      aria-live="polite"
      aria-hidden={!visible}
    >
      <span className="prompt-lead">are you </span>
      <span
        key={`${verb}-${visible}`}
        className={`prompt-verb${struck ? ' is-struck' : ''}`}
      >
        {verb}
      </span>
      <span className="prompt-lead">?</span>
    </p>
  )
}

function CrossMarks({
  crosses,
  variant,
  onBreathEnd,
}: {
  crosses: Cross[]
  variant: 'base' | 'shadow'
  onBreathEnd?: (id: number) => void
}) {
  return (
    <>
      {crosses.map((cross) => (
        <span
          key={`${variant}-${cross.id}`}
          className={`cross cross--${variant}`}
          style={{
            left: `${cross.x}%`,
            top: `${cross.y}%`,
            width: cross.size,
            height: cross.size,
            animationDuration: `${BREATH_MS}ms`,
          }}
          onAnimationEnd={
            onBreathEnd ? () => onBreathEnd(cross.id) : undefined
          }
        />
      ))}
    </>
  )
}

function SoundToggle({
  on,
  onToggle,
}: {
  on: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      className={`sound-toggle${on ? ' is-on' : ' is-off'}`}
      onClick={onToggle}
      aria-label={on ? 'Mute sound' : 'Unmute sound'}
      aria-pressed={on}
    >
      {on ? (
        <svg
          className="sound-toggle-icon"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            fill="currentColor"
            d="M4 9v6h3l5 4V5L7 9H4z"
          />
          <path
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            d="M15.5 8.5a4.5 4.5 0 0 1 0 7M18 6a8 8 0 0 1 0 12"
          />
        </svg>
      ) : (
        <svg
          className="sound-toggle-icon"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            fill="currentColor"
            d="M4 9v6h3l5 4V5L7 9H4z"
          />
          <path
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            d="M16 9.5 20.5 14.5M20.5 9.5 16 14.5"
          />
        </svg>
      )}
    </button>
  )
}

function App() {
  const stageRef = useRef<HTMLElement>(null)
  const wordmarkRef = useRef<HTMLDivElement>(null)
  const maskRef = useRef<WordMask | null>(null)
  const stemsRef = useRef<HoverStems | null>(null)
  const [crosses, setCrosses] = useState<Cross[]>([])
  const [wordMask, setWordMask] = useState<string>('')
  const [soundOn, setSoundOn] = useState(false)
  const [affHot, setAffHot] = useState(false)
  const timersRef = useRef<number[]>([])
  const wordmarkApiRef = useRef<AsciiWordmarkRenderer | null>(null)

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }, [])

  const scheduleSpawn = useCallback((delayMs: number) => {
    const timer = window.setTimeout(() => {
      setCrosses((prev) => {
        if (prev.length >= MAX_CROSSES) return prev
        return [...prev, spawnCross()]
      })
    }, delayMs)
    timersRef.current.push(timer)
  }, [])

  useEffect(() => {
    for (let i = 0; i < MAX_CROSSES; i++) {
      scheduleSpawn(Math.random() * 4500)
    }
    return clearTimers
  }, [scheduleSpawn, clearTimers])

  useEffect(() => {
    const stems = new HoverStems()
    stemsRef.current = stems
    return () => {
      stems.dispose()
      stemsRef.current = null
    }
  }, [])

  useEffect(() => {
    stemsRef.current?.setMaster(soundOn)
  }, [soundOn])

  useEffect(() => {
    stemsRef.current?.setHover(affHot && soundOn)
  }, [affHot, soundOn])

  useEffect(() => {
    const host = wordmarkRef.current
    if (!host) return

    let disposed = false
    let wordmark: AsciiWordmarkRenderer | null = null

    void (async () => {
      try {
        await document.fonts.load(`700 240px ${WORDMARK_FONT}`)
        await document.fonts.ready
      } catch {
        // fall back to system serifs in word-points
      }
      if (disposed || !wordmarkRef.current) return

      wordmark = new AsciiWordmarkRenderer(wordmarkRef.current, {
        word: WORD,
        inkColor: '#ffffff',
      })

      if (!wordmark.mount()) return
      wordmarkApiRef.current = wordmark
      wordmark.start()
    })()

    return () => {
      disposed = true
      wordmarkApiRef.current = null
      wordmark?.dispose()
    }
  }, [WORD, LOWERCASE_SCALE, WORDMARK_FONT, WORDMARK_VIEW_SCALE])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    let cancelled = false
    const updateMask = () => {
      const { clientWidth: w, clientHeight: h } = stage
      if (w === 0 || h === 0) return
      const mask = buildWordMask(WORD, w, h)
      maskRef.current = mask
      setWordMask(mask.dataUrl)
    }

    void (async () => {
      try {
        await document.fonts.load(`700 240px ${WORDMARK_FONT}`)
        await document.fonts.ready
      } catch {
        // use fallback metrics
      }
      if (!cancelled) updateMask()
    })()

    const ro = new ResizeObserver(updateMask)
    ro.observe(stage)
    return () => {
      cancelled = true
      ro.disconnect()
    }
  }, [WORD, WORDMARK_FONT, WORDMARK_VIEW_SCALE])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    let pressId: number | null = null

    const isTouchLike = (e: PointerEvent) =>
      e.pointerType === 'touch' || e.pointerType === 'pen'

    const sample = (e: PointerEvent) => {
      const rect = stage.getBoundingClientRect()
      const pad = isTouchLike(e) ? 18 : 0
      return (
        maskRef.current?.hitTest(
          e.clientX - rect.left,
          e.clientY - rect.top,
          pad,
        ) ?? false
      )
    }

    const setHot = (hot: boolean) => {
      setAffHot((prev) => (prev === hot ? prev : hot))
    }

    const driveVisuals = (e: PointerEvent, active: boolean) => {
      wordmarkApiRef.current?.setScreenPointer(e.clientX, e.clientY, active)
    }

    const onMove = (e: PointerEvent) => {
      if (isTouchLike(e)) {
        if (pressId === e.pointerId) {
          const hot = sample(e)
          setHot(hot)
          driveVisuals(e, hot)
        }
        return
      }
      const hot = sample(e)
      setHot(hot)
      driveVisuals(e, true)
    }

    const onDown = (e: PointerEvent) => {
      void stemsRef.current?.ensureRunning()
      if (!isTouchLike(e)) return
      const hot = sample(e)
      if (!hot) return
      pressId = e.pointerId
      setHot(true)
      driveVisuals(e, true)
      e.preventDefault()
    }

    const endPress = (e: PointerEvent) => {
      if (pressId !== e.pointerId) return
      pressId = null
      setHot(false)
      driveVisuals(e, false)
    }

    const onLeave = (e: PointerEvent) => {
      if (isTouchLike(e)) return
      setHot(false)
      driveVisuals(e, false)
    }

    stage.addEventListener('pointermove', onMove)
    stage.addEventListener('pointerdown', onDown, { passive: false })
    stage.addEventListener('pointerup', endPress)
    stage.addEventListener('pointercancel', endPress)
    stage.addEventListener('pointerleave', onLeave)

    return () => {
      stage.removeEventListener('pointermove', onMove)
      stage.removeEventListener('pointerdown', onDown)
      stage.removeEventListener('pointerup', endPress)
      stage.removeEventListener('pointercancel', endPress)
      stage.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  const handleBreathEnd = useCallback(
    (id: number) => {
      setCrosses((prev) => prev.filter((cross) => cross.id !== id))
      scheduleSpawn(randomGapMs())
    },
    [scheduleSpawn],
  )

  const toggleSound = useCallback(() => {
    void stemsRef.current?.ensureRunning().then(() => {
      setSoundOn((v) => !v)
    })
  }, [])

  return (
    <main className="stage" ref={stageRef}>
      <SoundToggle on={soundOn} onToggle={toggleSound} />

      <div className="cross-field cross-field--base" aria-hidden="true">
        <CrossMarks
          crosses={crosses}
          variant="base"
          onBreathEnd={handleBreathEnd}
        />
      </div>

      <LoveAura />

      <div
        ref={wordmarkRef}
        className={`wordmark${affHot ? ' is-hot' : ''}`}
        role="img"
        aria-label={WORD}
      />

      <PromptLine />

      <div
        className="cross-field cross-field--shadow"
        aria-hidden="true"
        style={
          wordMask
            ? {
                maskImage: `url(${wordMask})`,
                WebkitMaskImage: `url(${wordMask})`,
              }
            : undefined
        }
      >
        <CrossMarks crosses={crosses} variant="shadow" />
      </div>
    </main>
  )
}

export default App
