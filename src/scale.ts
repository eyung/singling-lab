import type { ScaleConfig, ScaleMode } from './types'

// Interval patterns (semitones from root) for each scale mode
const MODE_INTERVALS: Record<ScaleMode, readonly number[]> = {
  major:           [0, 2, 4, 5, 7, 9, 11],
  minor:           [0, 2, 3, 5, 7, 8, 10],
  pentatonic:      [0, 2, 4, 7, 9],
  pentatonicMinor: [0, 3, 5, 7, 10],
  dorian:          [0, 2, 3, 5, 7, 9, 10],
  mixolydian:      [0, 2, 4, 5, 7, 9, 10],
  wholetone:       [0, 2, 4, 6, 8, 10],
  chromatic:       [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
}

export const NOTE_NAMES: readonly string[] = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']

const MIDI_LO = 24  // C1
const MIDI_HI = 108 // C8

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

// All member frequencies of a scale across MIDI 24–108, ascending.
export function buildScaleFreqs(scale: ScaleConfig): number[] {
  const intervals = MODE_INTERVALS[scale.mode]
  const members = new Set(intervals.map(i => (i + scale.root) % 12))
  const freqs: number[] = []
  for (let m = MIDI_LO; m <= MIDI_HI; m++) {
    if (members.has(m % 12)) freqs.push(midiToFreq(m))
  }
  return freqs
}

// Quantise a frequency to the nearest scale member (log-distance, binary search).
export function quantiseFreq(frequency: number, scaleFreqs: readonly number[]): number {
  if (frequency <= 0 || !scaleFreqs.length) return frequency
  let lo = 0
  let hi = scaleFreqs.length - 1
  if (frequency <= scaleFreqs[lo]!) return scaleFreqs[lo]!
  if (frequency >= scaleFreqs[hi]!) return scaleFreqs[hi]!
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (scaleFreqs[mid]! < frequency) lo = mid
    else hi = mid
  }
  const dLo = Math.abs(Math.log2(frequency / scaleFreqs[lo]!))
  const dHi = Math.abs(Math.log2(frequency / scaleFreqs[hi]!))
  return dLo <= dHi ? scaleFreqs[lo]! : scaleFreqs[hi]!
}

export function scaleLabel(scale: ScaleConfig): string {
  return `${NOTE_NAMES[scale.root]} ${scale.mode}`
}
