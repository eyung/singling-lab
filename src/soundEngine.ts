import type { ParseUnit, SoundParams, AppParams } from './types'

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t))
}

// Map a unit's text to a 0–1 value based on character codes
function textToNorm(text: string): number {
  if (!text) return 0.5
  const sum = [...text].reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return (sum % 97) / 97
}

export function buildSoundParams(unit: ParseUnit, params: AppParams): SoundParams {
  const lp = params.levels[unit.level]
  const sp = params.semantic

  let pitchNorm = textToNorm(unit.text)
  let durationNorm = textToNorm(unit.text.split('').reverse().join(''))
  let filterCutoff = lp.filterCutoff

  // Apply semantic overrides
  if (sp.sentimentToPitch) {
    // Blend toward sentiment: positive → higher in range, negative → lower
    const sentimentBias = (unit.semantic.sentiment + 1) / 2 // 0–1
    pitchNorm = lerp(pitchNorm, sentimentBias, 0.5)
  }
  if (sp.energyToFilterCutoff) {
    filterCutoff = lerp(200, 8000, unit.semantic.energy)
  }
  const frequency = lerp(lp.pitchMin, lp.pitchMax, pitchNorm)
  const duration = lerp(lp.durationMin, lp.durationMax, durationNorm)

  return {
    frequency,
    waveform: lp.waveform,
    duration,
    attack: lp.attack,
    release: lp.release,
    filterCutoff,
    filterQ: lp.filterQ,
    gain: lp.gain,
    detune: (pitchNorm - 0.5) * 20, // slight detune adds character
  }
}

export class SoundEngine {
  private ctx: AudioContext | null = null
  private activeVoices = 0
  private maxVoices: number

  constructor(maxVoices = 4) {
    this.maxVoices = maxVoices
  }

  private getCtx(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new AudioContext()
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
    return this.ctx
  }

  playUnit(sp: SoundParams): void {
    if (this.activeVoices >= this.maxVoices) return

    const ctx = this.getCtx()
    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    const filter = ctx.createBiquadFilter()
    const gain = ctx.createGain()

    osc.type = sp.waveform
    osc.frequency.setValueAtTime(sp.frequency, now)
    osc.detune.setValueAtTime(sp.detune, now)

    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(sp.filterCutoff, now)
    filter.Q.setValueAtTime(sp.filterQ, now)

    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(sp.gain, now + sp.attack)
    gain.gain.setValueAtTime(sp.gain, now + sp.duration - sp.release)
    gain.gain.linearRampToValueAtTime(0, now + sp.duration)

    osc.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + sp.duration)

    this.activeVoices++
    osc.onended = () => { this.activeVoices-- }
  }

  stop(): void {
    this.ctx?.close()
    this.ctx = null
    this.activeVoices = 0
  }

  updateMaxVoices(n: number): void {
    this.maxVoices = n
  }
}
