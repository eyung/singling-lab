import type { SoundParams, Timeline, TimelineEvent } from './types'
import { getSoundCharacter } from './soundCharacters'

// Synthesis core. The same scheduleEvent() graph builder drives both the live
// AudioContext and the OfflineAudioContext WAV render, so exports sound
// identical to playback. Noise is seeded per event → renders are reproducible.

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const MAX_NOISE_BUFFER_S = 8

function makeNoiseBuffer(
  ctx: BaseAudioContext,
  duration: number,
  color: 'white' | 'pink',
  seed: number,
): AudioBuffer {
  const sampleRate = ctx.sampleRate
  const frameCount = Math.max(1, Math.ceil(sampleRate * Math.min(duration, MAX_NOISE_BUFFER_S)))
  const buffer = ctx.createBuffer(1, frameCount, sampleRate)
  const data = buffer.getChannelData(0)
  const rng = mulberry32(seed)

  if (color === 'white') {
    for (let i = 0; i < frameCount; i++) {
      data[i] = rng() * 2 - 1
    }
  } else {
    // Voss-McCartney 6-generator pink noise approximation
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0
    for (let i = 0; i < frameCount; i++) {
      const white = rng() * 2 - 1
      b0 = 0.99886 * b0 + white * 0.0555179
      b1 = 0.99332 * b1 + white * 0.0750759
      b2 = 0.96900 * b2 + white * 0.1538520
      b3 = 0.86650 * b3 + white * 0.3104856
      b4 = 0.55000 * b4 + white * 0.5329522
      b5 = -0.7616 * b5 - white * 0.0168980
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + white * 0.5362) / 6
    }
  }
  return buffer
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

// Master bus: input gain → limiter-style compressor (→ analyser, live only) → destination
export interface MasterChain {
  input: GainNode
  compressor: DynamicsCompressorNode
  analyser: AnalyserNode | null
}

export function createMasterChain(ctx: BaseAudioContext, withAnalyser: boolean): MasterChain {
  const input = ctx.createGain()
  input.gain.value = 1
  const compressor = ctx.createDynamicsCompressor()
  compressor.threshold.value = -3
  compressor.knee.value = 6
  compressor.ratio.value = 4
  compressor.attack.value = 0.003
  compressor.release.value = 0.25
  input.connect(compressor)
  let analyser: AnalyserNode | null = null
  if (withAnalyser) {
    analyser = ctx.createAnalyser()
    analyser.fftSize = 2048
    analyser.smoothingTimeConstant = 0.55
    compressor.connect(analyser)
    analyser.connect(ctx.destination)
  } else {
    compressor.connect(ctx.destination)
  }
  return { input, compressor, analyser }
}

// Build and schedule the audio graph for one timeline event at absolute ctx time `at`.
export function scheduleEvent(ctx: BaseAudioContext, dest: AudioNode, ev: TimelineEvent, at: number): void {
  if (ev.dropped) return
  scheduleSound(ctx, dest, ev.sp, ev.characterId, ev.layerGain, at,
    ((ev.range.start + 1) * 2654435761 ^ Math.round(ev.tMs * 7)) >>> 0)
}

export function scheduleSound(
  ctx: BaseAudioContext,
  dest: AudioNode,
  sp: SoundParams,
  characterId: string | null,
  layerGain: number,
  at: number,
  seed: number,
): void {
  const char = characterId ? getSoundCharacter(characterId) : undefined

  // sanitise the envelope so ramps never cross (no clicks)
  const dur = Math.max(sp.duration, 0.02)
  const atk = clamp(sp.attack, 0.001, dur * 0.5)
  const rel = clamp(sp.release, 0.005, dur - atk)
  const peak = clamp(sp.gain * layerGain, 0, 1.2)
  if (peak <= 0) return

  const gainNode = ctx.createGain()
  gainNode.gain.setValueAtTime(0, at)
  gainNode.gain.linearRampToValueAtTime(peak, at + atk)
  const relStart = at + dur - rel
  if (relStart > at + atk) gainNode.gain.setValueAtTime(peak, relStart)
  gainNode.gain.linearRampToValueAtTime(0, at + dur)

  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(clamp(sp.filterCutoff, 20, 18000), at)
  filter.Q.setValueAtTime(sp.filterQ, at)

  let out: AudioNode = gainNode
  if (sp.pan !== 0) {
    const panner = ctx.createStereoPanner()
    panner.pan.setValueAtTime(clamp(sp.pan, -1, 1), at)
    gainNode.connect(panner)
    out = panner
  }

  if (char?.source === 'noise') {
    const buffer = makeNoiseBuffer(ctx, dur, char.noiseColor ?? 'white', seed)
    const src = ctx.createBufferSource()
    src.buffer = buffer
    src.loop = dur > MAX_NOISE_BUFFER_S

    const shape = ctx.createBiquadFilter()
    shape.type = char.noiseFilterType ?? 'lowpass'
    shape.frequency.setValueAtTime(char.noiseFilterFreq ?? sp.filterCutoff, at)
    shape.Q.setValueAtTime(char.filterQ, at)

    src.connect(shape)
    shape.connect(filter)
    filter.connect(gainNode)
    out.connect(dest)
    src.start(at)
    src.stop(at + dur + 0.02)
  } else {
    const osc = ctx.createOscillator()
    osc.type = char?.waveform ?? sp.waveform
    osc.frequency.setValueAtTime(sp.frequency, at)
    if (sp.glideTo !== undefined && sp.glideTo !== sp.frequency) {
      const glideStart = at + Math.min(0.04, dur * 0.2)
      osc.frequency.setValueAtTime(sp.frequency, glideStart)
      osc.frequency.linearRampToValueAtTime(sp.glideTo, at + dur * 0.75)
    }
    osc.detune.setValueAtTime(sp.detune, at)
    osc.connect(filter)
    filter.connect(gainNode)
    out.connect(dest)
    osc.start(at)
    osc.stop(at + dur + 0.02)
  }
}

export type EngineState = 'idle' | 'playing' | 'paused'

const LOOKAHEAD_MS = 350
const TIMER_MS = 100
const START_DELAY_S = 0.1

// Live playback engine: lookahead scheduler over a precomputed Timeline.
// Pause/resume map to AudioContext suspend/resume (the audio clock freezes,
// so scheduled events and the position stay perfectly aligned).
export class LiveEngine {
  private ctx: AudioContext | null = null
  private master: MasterChain | null = null
  private timer: ReturnType<typeof setInterval> | null = null
  private timeline: Timeline | null = null
  private fromMs = 0
  private t0 = 0
  private nextIdx = 0
  private state: EngineState = 'idle'
  private onEnded: (() => void) | null = null

  private ensureCtx(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new AudioContext()
      this.master = null
    }
    if (this.ctx.state === 'suspended' && this.state !== 'paused') {
      void this.ctx.resume()
    }
    if (!this.master) {
      this.master = createMasterChain(this.ctx, true)
    }
    return this.ctx
  }

  getState(): EngineState {
    return this.state
  }

  getAnalyser(): AnalyserNode | null {
    return this.master?.analyser ?? null
  }

  positionMs(): number {
    if (!this.ctx || this.state === 'idle' || !this.timeline) return 0
    const pos = (this.ctx.currentTime - this.t0) * 1000 + this.fromMs
    return clamp(pos, 0, this.timeline.totalMs)
  }

  play(timeline: Timeline, fromMs: number, onEnded: () => void): void {
    this.cancelSchedule(true)
    const ctx = this.ensureCtx()
    if (ctx.state === 'suspended') void ctx.resume()
    this.timeline = timeline
    this.fromMs = clamp(fromMs, 0, timeline.totalMs)
    this.t0 = ctx.currentTime + START_DELAY_S
    this.onEnded = onEnded
    this.state = 'playing'

    const events = timeline.events
    this.nextIdx = 0
    while (this.nextIdx < events.length && events[this.nextIdx]!.tMs < this.fromMs - 1) this.nextIdx++

    const tick = () => {
      if (!this.ctx || !this.timeline || this.state === 'idle') return
      if (this.ctx.state === 'suspended') return
      const posMs = (this.ctx.currentTime - this.t0) * 1000 + this.fromMs
      const horizon = posMs + LOOKAHEAD_MS
      const master = this.master
      while (this.nextIdx < events.length && events[this.nextIdx]!.tMs <= horizon) {
        const ev = events[this.nextIdx]!
        this.nextIdx++
        if (master) {
          const at = Math.max(this.ctx.currentTime + 0.005, this.t0 + (ev.tMs - this.fromMs) / 1000)
          scheduleEvent(this.ctx, master.input, ev, at)
        }
      }
      if (this.nextIdx >= events.length && posMs >= this.timeline.totalMs) {
        this.finishNaturally()
      }
    }
    if (this.timer) clearInterval(this.timer)
    this.timer = setInterval(tick, TIMER_MS)
    tick()
  }

  pause(): void {
    if (this.state !== 'playing' || !this.ctx) return
    this.state = 'paused'
    void this.ctx.suspend()
  }

  resume(): void {
    if (this.state !== 'paused' || !this.ctx) return
    this.state = 'playing'
    void this.ctx.resume()
  }

  // user stop: fast-fade the master input to cut scheduled audio without clicks
  stop(): void {
    this.cancelSchedule(true)
  }

  private finishNaturally(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null }
    this.state = 'idle'
    const cb = this.onEnded
    this.onEnded = null
    if (cb) cb()
  }

  private cancelSchedule(cut: boolean): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null }
    this.onEnded = null
    if (this.state === 'idle') return
    this.state = 'idle'
    const ctx = this.ctx
    if (!ctx || ctx.state === 'closed') return
    if (ctx.state === 'suspended') void ctx.resume()
    if (cut && this.master) {
      const old = this.master
      old.input.gain.setTargetAtTime(0, ctx.currentTime, 0.012)
      setTimeout(() => {
        // tear the whole retired chain off the destination so nodes can be GC'd
        try { old.input.disconnect() } catch { /* already gone */ }
        try { old.compressor.disconnect() } catch { /* already gone */ }
        try { old.analyser?.disconnect() } catch { /* already gone */ }
      }, 150)
      this.master = null // rebuilt lazily on next play
    }
  }

  // one-off sound (live typing preview, UI auditions)
  playOne(sp: SoundParams, characterId: string | null): void {
    const ctx = this.ensureCtx()
    const master = this.master
    if (!master) return
    const seed = (Math.round(sp.frequency * 31 + sp.duration * 997) * 2654435761) >>> 0
    scheduleSound(ctx, master.input, sp, characterId, 1, ctx.currentTime + 0.02, seed)
  }

  dispose(): void {
    this.cancelSchedule(false)
    if (this.ctx && this.ctx.state !== 'closed') void this.ctx.close()
    this.ctx = null
    this.master = null
  }
}
