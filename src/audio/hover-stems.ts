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
      this.loadPromise = this.loadAndStart(this.ctx, this.hover)
    }

    if (this.ctx.state === 'suspended') await this.ctx.resume()
    await this.loadPromise

    // Re-apply gates after unlock — Aff may already be hot pre-gesture.
    this.applyMaster(true)
    this.applyHover(true)
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

  private applyMaster(immediate = false) {
    if (!this.master || !this.ctx) return
    const t = this.ctx.currentTime
    const target = this.masterOn ? 0.75 : 0
    this.master.gain.cancelScheduledValues(t)
    if (immediate) this.master.gain.setValueAtTime(target, t)
    else this.master.gain.linearRampToValueAtTime(target, t + 0.12)
  }

  private applyHover(immediate = false) {
    if (!this.hover || !this.ctx) return
    const t = this.ctx.currentTime
    const target = this.hoverOn ? 1 : 0
    this.hover.gain.cancelScheduledValues(t)
    if (immediate) this.hover.gain.setValueAtTime(target, t)
    else this.hover.gain.linearRampToValueAtTime(target, t + 0.18)
  }

  setMaster(on: boolean) {
    this.masterOn = on
    this.applyMaster()
  }

  setHover(on: boolean) {
    this.hoverOn = on
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
