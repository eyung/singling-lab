import type { ParseUnit, SoundParams, AppParams, SoundCharacter } from './types'

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t))
}

// Map a unit's text to a 0–1 value based on character codes
function textToNorm(text: string): number {
  if (!text) return 0.5
  const sum = [...text].reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return (sum % 97) / 97
}

// C major note frequencies across C2–C6 (28 notes)
const C_MAJOR_FREQS: readonly number[] = [
  65.41, 73.42, 82.41, 87.31, 98.00, 110.00, 123.47,     // C2–B2
  130.81, 146.83, 164.81, 174.61, 196.00, 220.00, 246.94, // C3–B3
  261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, // C4–B4
  523.25, 587.33, 659.26, 698.46, 783.99, 880.00, 987.77, // C5–B5
]

// Quantise a frequency to the nearest C major note across C2–C6
export function quantiseToCMajor(frequency: number): number {
  if (frequency <= 0) return 261.63
  let best = C_MAJOR_FREQS[0]!
  let bestDist = Math.abs(Math.log2(frequency / best))
  for (let i = 1; i < C_MAJOR_FREQS.length; i++) {
    const dist = Math.abs(Math.log2(frequency / C_MAJOR_FREQS[i]!))
    if (dist < bestDist) { bestDist = dist; best = C_MAJOR_FREQS[i]! }
  }
  return best
}

// Generate a noise buffer (white or pink) of the given duration
function generateNoiseBuffer(ctx: AudioContext, duration: number, noiseColor: 'white' | 'pink'): AudioBuffer {
  const sampleRate = ctx.sampleRate
  const frameCount = Math.max(1, Math.ceil(sampleRate * duration))
  const buffer = ctx.createBuffer(1, frameCount, sampleRate)
  const data = buffer.getChannelData(0)

  if (noiseColor === 'white') {
    for (let i = 0; i < frameCount; i++) {
      data[i] = Math.random() * 2 - 1
    }
  } else {
    // Voss-McCartney 6-generator pink noise approximation
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0
    for (let i = 0; i < frameCount; i++) {
      const white = Math.random() * 2 - 1
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

export function buildSoundParams(unit: ParseUnit, params: AppParams): SoundParams {
  const lp = params.levels[unit.level]
  const sp = params.semantic

  let pitchNorm = textToNorm(unit.text)
  let durationNorm = textToNorm(unit.text.split('').reverse().join(''))
  let filterCutoff = lp.filterCutoff

  // Apply semantic overrides
  if (sp.sentimentToPitch) {
    const sentimentBias = (unit.semantic.sentiment + 1) / 2
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
    detune: (pitchNorm - 0.5) * 20,
  }
}

export class SoundEngine {
  private ctx: AudioContext | null = null
  private activeVoices = 0
  private maxVoices: number
  private compressor: DynamicsCompressorNode | null = null

  constructor(maxVoices = 4) {
    this.maxVoices = maxVoices
  }

  private getCtx(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new AudioContext()
      this.compressor = null // reset compressor on new context
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
    return this.ctx
  }

  private getCompressor(ctx: AudioContext): DynamicsCompressorNode {
    if (!this.compressor) {
      this.compressor = ctx.createDynamicsCompressor()
      this.compressor.threshold.value = -3
      this.compressor.knee.value = 6
      this.compressor.ratio.value = 4
      this.compressor.attack.value = 0.003
      this.compressor.release.value = 0.25
      this.compressor.connect(ctx.destination)
    }
    return this.compressor
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

  playLayeredUnit(sp: SoundParams, char: SoundCharacter, layerGain: number): void {
    if (this.activeVoices >= this.maxVoices) return

    const ctx = this.getCtx()
    const compressor = this.getCompressor(ctx)
    const now = ctx.currentTime
    const peakGain = sp.gain * layerGain

    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(sp.filterCutoff, now)
    filter.Q.setValueAtTime(sp.filterQ, now)

    const gainNode = ctx.createGain()
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(peakGain, now + sp.attack)
    gainNode.gain.setValueAtTime(peakGain, now + sp.duration - sp.release)
    gainNode.gain.linearRampToValueAtTime(0, now + sp.duration)

    this.activeVoices++

    if (char.source === 'noise') {
      const buffer = generateNoiseBuffer(ctx, sp.duration, char.noiseColor ?? 'white')
      const bufferSource = ctx.createBufferSource()
      bufferSource.buffer = buffer
      bufferSource.loop = false

      const shapeFilter = ctx.createBiquadFilter()
      shapeFilter.type = char.noiseFilterType ?? 'lowpass'
      shapeFilter.frequency.setValueAtTime(char.noiseFilterFreq ?? char.filterCutoff, now)
      shapeFilter.Q.setValueAtTime(char.filterQ, now)

      bufferSource.connect(shapeFilter)
      shapeFilter.connect(filter)
      filter.connect(gainNode)
      gainNode.connect(compressor)

      bufferSource.start(now)
      bufferSource.onended = () => { this.activeVoices-- }
    } else {
      const osc = ctx.createOscillator()
      osc.type = char.waveform ?? 'sine'
      osc.frequency.setValueAtTime(sp.frequency, now)
      osc.detune.setValueAtTime(sp.detune, now)

      osc.connect(filter)
      filter.connect(gainNode)
      gainNode.connect(compressor)

      osc.start(now)
      osc.stop(now + sp.duration)
      osc.onended = () => { this.activeVoices-- }
    }
  }

  stop(): void {
    this.ctx?.close()
    this.ctx = null
    this.compressor = null
    this.activeVoices = 0
  }

  updateMaxVoices(n: number): void {
    this.maxVoices = n
  }
}
