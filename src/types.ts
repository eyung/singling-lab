// Parse granularity levels
export type ParseLevel = 'letter' | 'word' | 'phrase' | 'sentence' | 'paragraph'

// A named oscillator-based timbre preset
export interface InstrumentPreset {
  id: string
  name: string
  waveform: OscillatorType
  filterCutoff: number    // Hz
  filterQ: number
  attack: number          // seconds
  release: number         // seconds
  gain: number            // 0–1
}

// Semantic signals extracted from text
export interface SemanticSignal {
  sentiment: number       // -1 (negative) to 1 (positive)
  energy: number          // 0 (calm) to 1 (intense)
  tags: string[]          // pos tags, topics, etc.
}

// A discrete unit of parsed text with its semantic context
export interface ParseUnit {
  level: ParseLevel
  text: string
  index: number           // position in sequence
  semantic: SemanticSignal
}

// Sound parameters for a single unit
export interface SoundParams {
  frequency: number       // Hz
  waveform: OscillatorType
  duration: number        // seconds
  attack: number          // seconds
  release: number         // seconds
  filterCutoff: number    // Hz
  filterQ: number
  gain: number            // 0–1
  detune: number          // cents
}

// User-controlled mapping parameters per parse level
export interface LevelParams {
  enabled: boolean
  pitchMin: number        // Hz
  pitchMax: number        // Hz
  durationMin: number     // seconds
  durationMax: number     // seconds
  attack: number
  release: number
  waveform: OscillatorType
  filterCutoff: number
  filterQ: number
  gain: number
}

// Semantic override controls
export interface SemanticParams {
  sentimentToPitch: boolean     // positive sentiment → higher pitch
  energyToFilterCutoff: boolean // high energy → open filter
  energyToTempo: boolean        // high energy → shorter durations
}

// Full user parameter state
export interface AppParams {
  parseLevel: ParseLevel
  levels: Record<ParseLevel, LevelParams>
  semantic: SemanticParams
  polyphony: number             // max simultaneous voices
  tempo: number                 // ms between units (base)
  instrument: string            // ID of last-applied InstrumentPreset
}

// Clamp a number to [min, max]
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

// Enforce all VI.c validation rules on a LevelParams object
export function validateLevelParams(lp: LevelParams): LevelParams {
  const pitchMin = clamp(lp.pitchMin, 20, 20000)
  const pitchMax = Math.max(pitchMin + 1, clamp(lp.pitchMax, 20, 20000))
  const durationMin = clamp(lp.durationMin, 0.01, 60)
  const durationMax = Math.max(durationMin + 0.01, clamp(lp.durationMax, 0.01, 60))
  const attack = clamp(lp.attack, 0.001, 60)
  const release = clamp(lp.release, 0.001, 60)
  // attack + release must not exceed duration — clamp release if needed
  const safeRelease = Math.min(release, durationMin - attack)
  return {
    ...lp,
    pitchMin,
    pitchMax,
    durationMin,
    durationMax,
    attack,
    release: Math.max(0.001, safeRelease),
    filterCutoff: clamp(lp.filterCutoff, 20, 20000),
    filterQ: clamp(lp.filterQ, 0.1, 20),
    gain: clamp(lp.gain, 0, 1),
  }
}

// Enforce global param bounds
export function validateAppParams(p: AppParams): AppParams {
  return {
    ...p,
    polyphony: clamp(Math.round(p.polyphony), 1, 16),
    tempo: clamp(p.tempo, 50, 5000),
  }
}

export const DEFAULT_LEVEL_PARAMS: LevelParams = {
  enabled: true,
  pitchMin: 110,
  pitchMax: 880,
  durationMin: 0.1,
  durationMax: 0.6,
  attack: 0.01,
  release: 0.1,
  waveform: 'sine',
  filterCutoff: 2000,
  filterQ: 1,
  gain: 0.4,
}

export const DEFAULT_PARAMS: AppParams = {
  parseLevel: 'word',
  instrument: 'default',
  levels: {
    letter:    { ...DEFAULT_LEVEL_PARAMS, pitchMax: 1760, durationMax: 0.15 },
    word:      { ...DEFAULT_LEVEL_PARAMS },
    phrase:    { ...DEFAULT_LEVEL_PARAMS, pitchMin: 80, pitchMax: 440, durationMin: 0.3, durationMax: 1.2 },
    sentence:  { ...DEFAULT_LEVEL_PARAMS, pitchMin: 55, pitchMax: 220, durationMin: 0.5, durationMax: 2.0, waveform: 'triangle' },
    paragraph: { ...DEFAULT_LEVEL_PARAMS, pitchMin: 40, pitchMax: 110, durationMin: 1.0, durationMax: 4.0, waveform: 'sawtooth' },
  },
  semantic: {
    sentimentToPitch: true,
    energyToFilterCutoff: true,
    energyToTempo: true,
  },
  polyphony: 4,
  tempo: 300,
}
