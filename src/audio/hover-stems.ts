const TRACK_URL = '/audio/aff-hover.mp3'

/**
 * Aff-hover audio bed. Master mute + hover gate over a looping track.
 */
export class HoverStems {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private hover: GainNode | null = null
  private source: AudioBufferSourceNode | null = null
  private loadPromise: Promise<void> | null = null
  private masterOn = true
  private hoverOn = false
  private hoverLevel = 0.9

  async ensureRunning() {
    if (!this.ctx) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext
      this.ctx = new Ctx()
      this.master = this.ctx.createGain()
      this.hover = this.ctx.createGain()
      this.master.gain.value = 0
      this.hover.gain.value = 0
      this.hover.connect(this.master)
      this.master.connect(this.ctx.destination)
      // Swallow load failure so callers (e.g. the sound toggle) never hang or reject.
      this.loadPromise = this.loadAndStart(this.ctx, this.hover).catch((err) => {
        console.warn('[hover-stems] track load failed', err)
      })
    }

    if (this.ctx.state === 'suspended') await this.ctx.resume()
    await this.loadPromise

    // Re-apply gates after unlock — Aff may already be hot pre-gesture.
    this.applyMaster()
    this.applyHover()
  }

  private async loadAndStart(ctx: AudioContext, dest: AudioNode) {
    const res = await fetch(TRACK_URL)
    if (!res.ok) throw new Error(`Failed to load ${TRACK_URL}`)
    const buffer = await ctx.decodeAudioData(await res.arrayBuffer())
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.loop = true
    source.connect(dest)
    source.start(0)
    this.source = source
  }

  private applyMaster() {
    if (!this.master || !this.ctx) return
    const t = this.ctx.currentTime
    const gain = this.master.gain
    const target = this.masterOn ? 0.75 : 0
    // Anchor at the current value before ramping: without this, the ramp
    // interpolates from a stale scheduled point, producing clicks/zipper noise.
    gain.cancelScheduledValues(t)
    gain.setValueAtTime(gain.value, t)
    gain.linearRampToValueAtTime(target, t + 0.12)
  }

  private applyHover() {
    if (!this.hover || !this.ctx) return
    const t = this.ctx.currentTime
    const gain = this.hover.gain
    const target = this.hoverOn ? this.hoverLevel : 0
    gain.cancelScheduledValues(t)
    gain.setValueAtTime(gain.value, t)
    // Short ramp so volume can follow the cursor's vertical position smoothly
    // (no zipper noise, thanks to the anchored setValueAtTime above).
    gain.linearRampToValueAtTime(target, t + 0.09)
  }

  setMaster(on: boolean) {
    this.masterOn = on
    this.applyMaster()
  }

  /** `level` (0–1) sets the hover volume, e.g. by cursor height over the letters. */
  setHover(on: boolean, level = this.hoverLevel) {
    this.hoverOn = on
    this.hoverLevel = Math.min(1, Math.max(0, level))
    this.applyHover()
  }

  dispose() {
    try {
      this.source?.stop()
    } catch {
      // already stopped
    }
    this.source?.disconnect()
    void this.ctx?.close()
    this.source = null
    this.ctx = null
    this.master = null
    this.hover = null
    this.loadPromise = null
  }
}
